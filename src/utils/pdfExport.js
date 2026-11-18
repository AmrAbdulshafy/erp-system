/**
 * PDF Export Utility for Arabic & English documents
 * Fixes Arabic character disconnection (disjointed letters), RTL alignment, and font loading in html2pdf/html2canvas.
 */
export async function exportToPDF(element, filename = 'document.pdf') {
  if (!element) return;

  // 1. Wait for web fonts (such as Cairo) to finish decoding before canvas snapshot
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn('Font loading check error:', e);
    }
  }

  const html2pdf = (await import('html2pdf.js')).default;

  const opt = {
    margin: [8, 8, 8, 8],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      letterRendering: false, // CRITICAL: true breaks Arabic ligatures into isolated letters
      scrollY: 0,
      scrollX: 0,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  return html2pdf().set(opt).from(element).save();
}
