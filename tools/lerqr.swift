import Vision
import AppKit
// Lê QR codes de imagens (mesmo motor de leitura da câmera do iPhone). Uso: swift lerqr.swift img1.png img2.png ...
for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("ERRO\t\(path)"); continue }
    let req = VNDetectBarcodesRequest(); req.symbologies = [.qr]
    try? VNImageRequestHandler(cgImage: cg).perform([req])
    let val = (req.results ?? []).compactMap { $0.payloadStringValue }.first ?? ""
    print("\((path as NSString).lastPathComponent)\t\(val)")
}
