import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Generates a PDF from a DOM element and downloads it.
 * @param {string} elementId - The ID of the DOM element to capture.
 * @param {string} fileName - The name of the file to save (e.g., 'receipt.pdf').
 */
export const generatePDF = async (elementId, fileName = 'document.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID '${elementId}' not found`);
        return false;
    }

    try {
        // Clone the element to ensure it's captured correctly even if hidden/off-screen
        const clone = element.cloneNode(true);
        
        // Style the clone to be visible in viewport but underneath everything
        // This fixes blank PDF issues with off-screen elements
        Object.assign(clone.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            zIndex: '-9999',
            visibility: 'visible',
            display: 'block',
            width: '210mm', // Force A4 width
            height: 'auto',
            background: 'white' // Ensure background
        });

        document.body.appendChild(clone);

        // Capture the clone
        const canvas = await html2canvas(clone, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });

        // Remove clone
        document.body.removeChild(clone);

        // Generate PDF
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        
        // Calculate height while maintaining aspect ratio
        const imgProps = pdf.getImageProperties(imgData);
        const finalPdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalPdfHeight);
        pdf.save(fileName);
        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        return false;
    }
};

/**
 * Generates a PDF Blob from a DOM element.
 * @param {string} elementId 
 * @returns {Promise<Blob|null>}
 */
export const generatePDFBlob = async (elementId) => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
        const clone = element.cloneNode(true);
        Object.assign(clone.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            zIndex: '-9999',
            visibility: 'visible',
            display: 'block',
            width: '210mm',
            height: 'auto',
            background: 'white'
        });

        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });

        document.body.removeChild(clone);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const finalPdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalPdfHeight);
        return pdf.output('blob');
    } catch (error) {
        console.error('Error generating PDF Blob:', error);
        return null;
    }
};
