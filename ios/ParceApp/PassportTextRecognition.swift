import Foundation
import ImageIO
import React
import Vision

@objc(PassportTextRecognition)
final class PassportTextRecognition: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { false }

  private func temporaryPhoto(_ path: String) throws -> URL {
    let url: URL
    if path.hasPrefix("/") {
      url = URL(fileURLWithPath: path)
    } else if let candidate = URL(string: path), candidate.isFileURL,
              candidate.host == nil || candidate.host == "" || candidate.host == "localhost" {
      url = candidate
    } else {
      throw NSError(domain: "PassportTextRecognition", code: 1)
    }
    let resolved = url.standardizedFileURL.resolvingSymlinksInPath()
    let roots = [URL(fileURLWithPath: NSTemporaryDirectory())]
      + FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)
    let insideCache = roots.contains { root in
      let prefix = root.standardizedFileURL.resolvingSymlinksInPath().path
        .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
      let absolutePrefix = "/" + prefix + "/"
      return resolved.path.hasPrefix(absolutePrefix)
    }
    guard insideCache,
          ["jpg", "jpeg", "png", "heic", "heif"].contains(resolved.pathExtension.lowercased()) else {
      throw NSError(domain: "PassportTextRecognition", code: 1)
    }
    return resolved
  }

  @objc(recognize:resolver:rejecter:)
  func recognize(_ path: String, resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      autoreleasepool {
        let url: URL
        do {
          url = try self.temporaryPhoto(path)
          var isDirectory: ObjCBool = false
          guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory),
                !isDirectory.boolValue else {
            reject("INVALID_PHOTO", "La foto temporal no está disponible.", nil)
            return
          }
        } catch {
          reject("INVALID_PHOTO", "La foto temporal no está disponible.", nil)
          return
        }
        do {
          let request = VNRecognizeTextRequest()
          request.recognitionLevel = .accurate
          request.recognitionLanguages = ["en-US"]
          request.usesLanguageCorrection = false
          let source = CGImageSourceCreateWithURL(url as CFURL, nil)
          let properties = source.flatMap { CGImageSourceCopyPropertiesAtIndex($0, 0, nil) }
            as? [CFString: Any]
          let orientationValue = (properties?[kCGImagePropertyOrientation] as? NSNumber)?.uint32Value ?? 1
          let orientation = CGImagePropertyOrientation(rawValue: orientationValue) ?? .up
          try VNImageRequestHandler(url: url, orientation: orientation, options: [:]).perform([request])
          let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
            .joined(separator: "\n")
          resolve(text)
        } catch {
          reject("OCR_FAILED", "No pudimos leer el texto de la foto.", nil)
        }
      }
    }
  }

  @objc(deleteTemporaryFile:resolver:rejecter:)
  func deleteTemporaryFile(_ path: String, resolver resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .utility).async {
      do {
        let url = try self.temporaryPhoto(path)
        var isDirectory: ObjCBool = false
        if FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory) {
          guard !isDirectory.boolValue else {
            reject("PHOTO_CLEANUP_FAILED", "No pudimos eliminar la foto temporal.", nil)
            return
          }
          try FileManager.default.removeItem(at: url)
        }
        resolve(true)
      } catch {
        reject("PHOTO_CLEANUP_FAILED", "No pudimos eliminar la foto temporal.", nil)
      }
    }
  }
}
