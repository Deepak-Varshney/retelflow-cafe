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

private const val SAMPLE_RATE = 16_000 // what Gemini Live expects
private const val CHUNK_MS = 100

class RecorderException(message: String) : CodedException("ERR_PCM_RECORDER", message, null)

/**
 * Streams the microphone as raw 16 kHz mono PCM16 in ~100 ms base64 chunks
 * ("onAudioChunk" events), for Gemini Live voice ordering.
 */
class PcmRecorderModule : Module() {
  @Volatile private var recorder: AudioRecord? = null
  @Volatile private var thread: Thread? = null

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
  }
}
