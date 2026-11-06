package expo.modules.thermalprinter

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import com.android.print.sdk.PrinterConstants
import com.android.print.sdk.PrinterInstance
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val PREFS = "retelflow_thermal_printer"
private const val KEY_ADDRESS = "address"
private const val KEY_NAME = "name"
private const val CONNECT_TIMEOUT_MS = 8_000L

class PrinterException(code: String, message: String) : CodedException(code, message, null) {
  constructor(message: String) : this("ERR_THERMAL_PRINTER", message)
}

/**
 * Bridges the vendor AndroidPrintSDK (com.android.print.sdk) to JS.
 * Bluetooth only for now; the SDK's USB / WiFi constructors can be added the same way.
 */
class ThermalPrinterModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())

  private var printer: PrinterInstance? = null
  private var connectedAddress: String? = null
  private var pendingConnect: Promise? = null
  private var pendingTimeout: Runnable? = null

  private val context: Context
    get() = appContext.reactContext ?: throw PrinterException("REACT_CONTEXT_UNAVAILABLE", "React context is not available")

  private val prefs
    get() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  // Bluetooth switched off: the printer socket is dead even though the SDK
  // still says "connected". Drop it so the next print reconnects cleanly
  // instead of writing into a dead socket and hanging.
  private var bluetoothReceiver: BroadcastReceiver? = null
  private fun watchBluetooth() {
    if (bluetoothReceiver != null) return
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context?, intent: Intent?) {
        val state = intent?.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
        if (state == BluetoothAdapter.STATE_TURNING_OFF || state == BluetoothAdapter.STATE_OFF) {
          closeConnection()
          settleConnect { it.reject(PrinterException("BLUETOOTH_DISABLED", "Bluetooth is turned off on your phone. Please turn it on.")) }
          emitState(false)
        }
      }
    }
    try {
      context.registerReceiver(receiver, IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED))
      bluetoothReceiver = receiver
    } catch (_: Exception) {}
  }

  // The SDK reports connection state through an android.os.Handler.
  private val sdkHandler = Handler(Looper.getMainLooper()) { msg ->
    when (msg.what) {
      PrinterConstants.Connect.SUCCESS -> {
        settleConnect { it.resolve(true) }
        emitState(true)
      }
      PrinterConstants.Connect.FAILED -> {
        printer = null
        connectedAddress = null
        settleConnect { it.reject(PrinterException("PRINTER_OFF_OR_UNREACHABLE", "Printer is turned off or unreachable. Please turn it on and keep it close.")) }
        emitState(false)
      }
      PrinterConstants.Connect.CLOSED -> {
        printer = null
        connectedAddress = null
        settleConnect { it.reject(PrinterException("PRINTER_CONNECTION_CLOSED", "Printer connection closed")) }
        emitState(false)
      }
      PrinterConstants.Connect.NODEVICE -> {
        printer = null
        connectedAddress = null
        settleConnect { it.reject(PrinterException("PRINTER_OFF_OR_UNREACHABLE", "Printer not found. Please make sure it is turned on and paired.")) }
        emitState(false)
      }
    }
    true
  }

  override fun definition() = ModuleDefinition {
    Name("ThermalPrinter")

    Events("onConnectionChange")

    OnCreate {
      watchBluetooth()
    }

    Function("isConnected") {
      printer?.isConnected == true
    }

    Function("getSavedPrinter") {
      val address = prefs.getString(KEY_ADDRESS, null) ?: return@Function null
      mapOf("address" to address, "name" to (prefs.getString(KEY_NAME, null) ?: address))
    }

    Function("forgetPrinter") {
      prefs.edit().clear().apply()
    }

    AsyncFunction("getPairedDevices") {
      val adapter = requireAdapter()
      @SuppressLint("MissingPermission")
      val devices = adapter.bondedDevices.orEmpty().map {
        mapOf("name" to (it.name ?: it.address), "address" to it.address)
      }
      devices
    }

    AsyncFunction("connect") { address: String?, promise: Promise ->
      mainHandler.post { connectInternal(address, promise) }
    }

    AsyncFunction("disconnect") {
      closeConnection()
    }

    // Runs on the module's background queue, so blocking socket writes are fine here.
    AsyncFunction("print") { commands: List<Map<String, Any?>>, options: Map<String, Any?>? ->
      // Bluetooth off / permission gone: say so right away instead of a dead write
      try {
        requireAdapter()
      } catch (e: CodedException) {
        closeConnection()
        emitState(false)
        throw e
      }
      val p = printer
      if (p == null || !p.isConnected) {
        throw PrinterException("PRINTER_NOT_CONNECTED", "Printer is not connected")
      }
      val paperWidthDots = (options?.get("paperWidthDots") as? Number)?.toInt() ?: 384
      try {
        runJob(p, commands, paperWidthDots)
      } catch (e: Exception) {
        closeConnection()
        emitState(false)
        throw PrinterException("PRINTER_OFF_OR_UNREACHABLE", "Printer is turned off or unreachable. Please turn it on and keep it close.")
      }
    }

    OnDestroy {
      closeConnection()
      bluetoothReceiver?.let {
        try {
          context.unregisterReceiver(it)
        } catch (_: Exception) {}
      }
      bluetoothReceiver = null
    }
  }

  private fun requireAdapter(): BluetoothAdapter {
    // SCAN is required as well: the SDK's connect thread calls cancelDiscovery() and crashes
    // the app with an uncaught SecurityException when it is missing.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      listOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN).any {
        context.checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
      }
    ) {
      throw PrinterException("BLUETOOTH_PERMISSION_DENIED", "Bluetooth permission not granted. Allow 'Nearby devices' for this app in Settings.")
    }
    val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
    val adapter = manager?.adapter ?: throw PrinterException("BLUETOOTH_UNAVAILABLE", "Bluetooth is not supported on this device")
    if (!adapter.isEnabled) {
      throw PrinterException("BLUETOOTH_DISABLED", "Bluetooth is turned off on your phone. Please turn it on.")
    }
    return adapter
  }

  @SuppressLint("MissingPermission")
  private fun connectInternal(requestedAddress: String?, promise: Promise) {
    try {
      val address = requestedAddress ?: prefs.getString(KEY_ADDRESS, null)
        ?: throw PrinterException("NO_PRINTER_SAVED", "No printer selected. Choose a printer to connect.")

      val current = printer
      if (current != null && current.isConnected && connectedAddress == address) {
        promise.resolve(true)
        return
      }
      closeConnection()

      val adapter = requireAdapter()
      val device = adapter.getRemoteDevice(address)
      prefs.edit()
        .putString(KEY_ADDRESS, address)
        .putString(KEY_NAME, device.name ?: address)
        .apply()

      settleConnect { it.reject(PrinterException("CONNECTION_SUPERSEDED", "Connection superseded")) }
      pendingConnect = promise
      val timeout = Runnable {
        settleConnect { it.reject(PrinterException("PRINTER_OFF_OR_UNREACHABLE", "Printer is turned off or unreachable. Please turn it on and keep it close.")) }
      }
      pendingTimeout = timeout
      mainHandler.postDelayed(timeout, CONNECT_TIMEOUT_MS)

      connectedAddress = address
      printer = PrinterInstance(context, device, sdkHandler).also { it.openConnection() }
    } catch (e: CodedException) {
      promise.reject(e)
    } catch (e: Exception) {
      promise.reject(PrinterException("PRINTER_CONNECT_ERROR", e.message ?: "Could not connect to printer"))
    }
  }

  private fun settleConnect(block: (Promise) -> Unit) {
    pendingTimeout?.let { mainHandler.removeCallbacks(it) }
    pendingTimeout = null
    val p = pendingConnect ?: return
    pendingConnect = null
    block(p)
  }

  private fun closeConnection() {
    printer?.let {
      try {
        it.closeConnection()
      } catch (_: Exception) {
      }
    }
    printer = null
    connectedAddress = null
  }

  private fun emitState(connected: Boolean) {
    sendEvent("onConnectionChange", mapOf("connected" to connected))
  }

  private fun runJob(p: PrinterInstance, commands: List<Map<String, Any?>>, paperWidthDots: Int) {
    p.init()
    for (cmd in commands) {
      when (cmd["type"]) {
        "text" -> {
          val align = when (cmd["align"]) {
            "center" -> PrinterConstants.Command.ALIGN_CENTER
            "right" -> PrinterConstants.Command.ALIGN_RIGHT
            else -> PrinterConstants.Command.ALIGN_LEFT
          }
          p.setPrinter(PrinterConstants.Command.ALIGN, align)
          p.setPrintModel(
            cmd["bold"] == true,
            cmd["doubleHeight"] == true,
            cmd["doubleWidth"] == true,
            cmd["underline"] == true
          )
          val text = cmd["text"] as? String ?: ""
          p.printText(if (text.endsWith("\n")) text else "$text\n")
        }
        "feed" -> {
          val lines = (cmd["lines"] as? Number)?.toInt() ?: 1
          p.setPrinter(PrinterConstants.Command.PRINT_AND_WAKE_PAPER_BY_LINE, lines)
        }
        "image" -> {
          val base64 = cmd["base64"] as? String ?: continue
          val bytes = Base64.decode(base64.substringAfter("base64,"), Base64.DEFAULT)
          val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: continue
          p.setPrinter(PrinterConstants.Command.ALIGN, PrinterConstants.Command.ALIGN_CENTER)
          p.printImage(fitToPaper(bitmap, paperWidthDots))
        }
        "cut" -> p.cutPaper()
      }
    }
    // Leave the printer in a clean default state for the next job.
    p.setPrintModel(false, false, false, false)
    p.setPrinter(PrinterConstants.Command.ALIGN, PrinterConstants.Command.ALIGN_LEFT)
  }

  // SDK doc: bitmap width must be a multiple of 24 and must not exceed the head width (384 for 58mm).
  private fun fitToPaper(bitmap: Bitmap, paperWidthDots: Int): Bitmap {
    val maxWidth = paperWidthDots - paperWidthDots % 24
    val target = minOf(bitmap.width, maxWidth).let { it - it % 24 }.coerceAtLeast(24)
    if (target == bitmap.width) return bitmap
    val height = (bitmap.height * target.toFloat() / bitmap.width).toInt().coerceAtLeast(1)
    return Bitmap.createScaledBitmap(bitmap, target, height, true)
  }
}
