package com.parceapp

import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.File

class PassportTextRecognitionModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {
  override fun getName() = "PassportTextRecognition"

  // Only app cache photos may cross this bridge, including when deleting after failure.
  private fun temporaryPhoto(path: String): File {
    require(path.isNotBlank())
    val uri = Uri.parse(path)
    require(uri.scheme == null || (uri.scheme == "file" && uri.authority.isNullOrEmpty()))
    val file = File(if (uri.scheme == null) path else requireNotNull(uri.path)).canonicalFile
    val roots = listOfNotNull(context.cacheDir, context.externalCacheDir).map { it.canonicalFile }
    require(roots.any { file.toPath().startsWith(it.toPath()) && file != it })
    require(file.extension.lowercase() in setOf("jpg", "jpeg", "png", "heic", "heif"))
    return file
  }

  @ReactMethod
  fun recognize(path: String, promise: Promise) {
    val file = try {
      temporaryPhoto(path).also { require(it.isFile) }
    } catch (_: Exception) {
      promise.reject("INVALID_PHOTO", "La foto temporal no está disponible.")
      return
    }
    val recognizer = try {
      TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    } catch (_: Exception) {
      promise.reject("OCR_FAILED", "No pudimos iniciar el lector de texto.")
      return
    }
    try {
      val image = InputImage.fromFilePath(context, Uri.fromFile(file))
      recognizer.process(image)
          .addOnSuccessListener { result -> promise.resolve(result.text) }
          .addOnFailureListener {
            promise.reject("OCR_FAILED", "No pudimos leer el texto de la foto.")
          }
          .addOnCompleteListener { recognizer.close() }
    } catch (_: Exception) {
      recognizer.close()
      promise.reject("OCR_FAILED", "No pudimos leer el texto de la foto.")
    }
  }

  @ReactMethod
  fun deleteTemporaryFile(path: String, promise: Promise) {
    try {
      val file = temporaryPhoto(path)
      if (!file.exists() || (file.isFile && file.delete())) {
        promise.resolve(true)
      } else {
        promise.reject("PHOTO_CLEANUP_FAILED", "No pudimos eliminar la foto temporal.")
      }
    } catch (_: Exception) {
      promise.reject("PHOTO_CLEANUP_FAILED", "No pudimos eliminar la foto temporal.")
    }
  }
}
