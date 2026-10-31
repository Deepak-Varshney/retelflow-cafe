package expo.modules.pcmrecorder

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

private const val SAMPLE_RATE = 16_000 // what Gemini Live expects
private const val CHUNK_MS = 100

class RecorderException(message: String) : CodedException("ERR_PCM_RECORDER", message, null)

/**
 * Streams the microphone as raw 16 kHz mono PCM16 in ~100 ms base64 chunks
 * ("onAudioChunk" events), for Gemini Live voice ordering.
 * Also asynchronously caches the raw PCM to context.cacheDir/cafe_voice_last.pcm
 * in the background without blocking the UI or audio streaming.
 */
class PcmRecorderModule : Module() {
  @Volatile private var recorder: AudioRecord? = null
  @Volatile private var thread: Thread? = null
  @Volatile private var fileExecutor: ExecutorService? = null
  @Volatile private var fileOutputStream: FileOutputStream? = null

  override fun definition() = ModuleDefinition {
    Name("PcmRecorder")

    Events("onAudioChunk")

    Function("isRecording") {
      recorder != null
    }

    Function("start") {
      startRecording()
    }

    Function("stop") {
      stopRecording()
    }

    Function("getLastRecordingPath") {
      val context = appContext.reactContext ?: return@Function null
      val file = File(context.cacheDir, "cafe_voice_last.pcm")
      if (file.exists() && file.length() > 0) file.absolutePath else null
    }

    Function("getRecordedPcm") {
      val context = appContext.reactContext ?: return@Function null
      val file = File(context.cacheDir, "cafe_voice_last.pcm")
      if (!file.exists() || file.length() == 0L) return@Function null
      try {
        val bytes = file.readBytes()
        Base64.encodeToString(bytes, Base64.NO_WRAP)
      } catch (_: Exception) {
        null
      }
    }

    Function("clearLastRecording") {
      val context = appContext.reactContext ?: return@Function false
      val file = File(context.cacheDir, "cafe_voice_last.pcm")
      if (file.exists()) file.delete() else true
    }

    OnDestroy {
      stopRecording()
    }
  }

  @SuppressLint("MissingPermission")
  private fun startRecording() {
    if (recorder != null) return
    val context = appContext.reactContext ?: throw RecorderException("React context is not available")
    if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      throw RecorderException("Microphone permission not granted")
    }

    // Clean up any previous file writer before starting a new one
    closeFileWriter()

    // Prepare temporary cache file to store raw PCM for the last order
    try {
      val cacheDir = context.cacheDir
      cacheDir.mkdirs()
      val cacheFile = File(cacheDir, "cafe_voice_last.pcm")
      fileOutputStream = FileOutputStream(cacheFile, false)
      fileExecutor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "PcmFileWriter").apply { isDaemon = true }
      }
    } catch (_: Exception) {
      // Background recording to cache file is best-effort and must never block live voice
    }

    val chunkBytes = SAMPLE_RATE * 2 * CHUNK_MS / 1000
    val minBuffer = AudioRecord.getMinBufferSize(
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )
    // VOICE_RECOGNITION: no AGC / noise suppression tuned for calls, best for speech-to-text
    val record = AudioRecord(
      MediaRecorder.AudioSource.VOICE_RECOGNITION,
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      maxOf(minBuffer, chunkBytes * 4)
    )
    if (record.state != AudioRecord.STATE_INITIALIZED) {
      record.release()
      closeFileWriter()
      throw RecorderException("Microphone is busy or unavailable")
    }

    record.startRecording()
    recorder = record
    thread = Thread {
      val buffer = ByteArray(chunkBytes)
      while (recorder === record) {
        val read = record.read(buffer, 0, buffer.size)
        if (read > 0) {
          sendEvent("onAudioChunk", mapOf("data" to Base64.encodeToString(buffer, 0, read, Base64.NO_WRAP)))
          val chunkCopy = buffer.copyOf(read)
          try {
            fileExecutor?.execute {
              try {
                fileOutputStream?.write(chunkCopy)
              } catch (_: Exception) {}
            }
          } catch (_: Exception) {}
        } else if (read < 0) {
          break
        }
      }
    }.apply {
      name = "PcmRecorder"
      start()
    }
  }

  private fun stopRecording() {
    val record = recorder ?: return
    recorder = null
    try {
      record.stop()
    } catch (_: Exception) {
    }
    record.release()
    thread?.join(300)
    thread = null
    closeFileWriter()
  }

  private fun closeFileWriter() {
    val executor = fileExecutor
    fileExecutor = null
    val fos = fileOutputStream
    fileOutputStream = null

    if (executor == null && fos == null) return

    try {
      executor?.execute {
        try {
          fos?.flush()
          fos?.close()
        } catch (_: Exception) {}
      }
      executor?.shutdown()
      executor?.awaitTermination(300, TimeUnit.MILLISECONDS)
    } catch (_: Exception) {
    } finally {
      try {
        fos?.close()
      } catch (_: Exception) {}
    }
  }
}
