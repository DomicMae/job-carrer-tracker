import jsQR from 'jsqr';
import sharp from 'sharp';

/**
 * Memindai dan mengekstrak isi teks/URL dari QR Code pada gambar Base64.
 * Menggunakan sharp untuk normalisasi pixel RGBA dan toleransi kontras/inversi warna.
 */
export async function scanQrCodeFromBase64(base64String: string): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64String, 'base64');
    
    // Konversi gambar ke raw RGBA channels menggunakan sharp
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const clampedArray = new Uint8ClampedArray(data);
    
    // Pindai QR Code dengan percobaan orientasi normal maupun inversi warna
    const code = jsQR(clampedArray, info.width, info.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && code.data && code.data.trim()) {
      return code.data.trim();
    }

    // Jika belum terdeteksi (misal gambar terlalu besar / noise), lakukan resize & grayscale enhancement
    const enhanced = await sharp(buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .grayscale()
      .linear(1.3, -20) // Tingkatkan kontras
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const enhancedClamped = new Uint8ClampedArray(enhanced.data);
    const enhancedCode = jsQR(enhancedClamped, enhanced.info.width, enhanced.info.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (enhancedCode && enhancedCode.data && enhancedCode.data.trim()) {
      return enhancedCode.data.trim();
    }

    return null;
  } catch (error) {
    console.error('QR Scanner Error (ignorable):', error);
    return null;
  }
}
