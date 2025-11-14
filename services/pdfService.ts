// This service requires jspdf and html2canvas to be loaded globally.
// Make sure to include them in your index.html.

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
  }
}

interface PDFExportOptions {
    title: string;
    includeDateTime: boolean;
    orientation: 'p' | 'l';
}

export const exportToPDF = async (elementId: string, filename: string, options: PDFExportOptions) => {
  if (typeof window === 'undefined' || !window.jspdf || !window.html2canvas) {
    console.error("jsPDF or html2canvas is not loaded.");
    alert("PDF export functionality is not available. Please check your internet connection and try again.");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const html2canvas = window.html2canvas;

  const reportElement = document.getElementById(elementId);
  if (!reportElement) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  const exportButtonContainer = reportElement.querySelector('.export-pdf-button-container');
  if (exportButtonContainer) {
    (exportButtonContainer as HTMLElement).style.display = 'none';
  }

  try {
    const computedStyle = getComputedStyle(reportElement);
    const backgroundColor = computedStyle.backgroundColor;

    const canvas = await html2canvas(reportElement, {
      scale: 2, // Higher scale for better quality
      backgroundColor: backgroundColor || '#0D0D0D', // Use element background, fallback to primary
      useCORS: true,
    });
    
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF(options.orientation, 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Add Header
    pdf.setFontSize(18);
    pdf.setTextColor('#2D9CDB'); // Accent color
    pdf.text(options.title, pdfWidth / 2, 15, { align: 'center' });

    if (options.includeDateTime) {
        pdf.setFontSize(10);
        pdf.setTextColor('#BDBDBD'); // text-secondary
        pdf.text(new Date().toLocaleString(), pdfWidth / 2, 22, { align: 'center' });
    }

    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
    const contentStartY = 30; // Start content below the header

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, contentStartY, pdfWidth, imgHeight);
    heightLeft -= (pdfHeight - contentStartY);

    // Add subsequent pages if the content is long
    while (heightLeft > 0) {
      position = position - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position + contentStartY, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    pdf.save(filename);

  } catch (error) {
    console.error("Failed to generate PDF:", error);
    alert("An error occurred while generating the PDF. Please try again.");
  } finally {
     // Show the button again after capture
     if (exportButtonContainer) {
        (exportButtonContainer as HTMLElement).style.display = 'block';
    }
  }
};