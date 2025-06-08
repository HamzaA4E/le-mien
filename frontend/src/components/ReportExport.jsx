import React from 'react';
import html2pdf from 'html2pdf.js';

const ReportExport = ({ reportTitle, reportDate }) => {
  const exportToPDF = async () => {
    const element = document.querySelector('.report-content');
    if (!element) {
      alert('Aucun contenu de rapport à exporter.');
      return;
    }

    // Créer un en-tête temporaire
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px; padding: 20px; border-bottom: 2px solid #e5e7eb;">
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 10px;">${reportTitle}</h1>
        <p style="color: #6b7280; font-size: 14px;">Date du rapport: ${reportDate}</p>
      </div>
    `;
    element.insertBefore(header, element.firstChild);

    // Ajouter des styles pour le PDF
    const style = document.createElement('style');
    style.textContent = `
      .report-content {
        background-color: white;
        padding: 20px;
      }
      .report-content canvas {
        max-width: 100% !important;
        height: auto !important;
      }
      .report-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
      }
      .report-content th, .report-content td {
        border: 1px solid #e5e7eb;
        padding: 8px;
        text-align: left;
      }
      .report-content th {
        background-color: #f3f4f6;
        font-weight: 600;
      }
      .report-content tr:nth-child(even) {
        background-color: #f9fafb;
      }
    `;
    element.appendChild(style);

    const opt = {
      margin: 1,
      filename: `rapport_${reportTitle}_${reportDate}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' },
    };

    try {
      await html2pdf().set(opt).from(element).save();
      // Nettoyer les éléments ajoutés
      element.removeChild(header);
      element.removeChild(style);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      alert('Une erreur est survenue lors de l\'export du PDF');
    }
  };

  return (
    <button onClick={exportToPDF} className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center gap-2">
      <i className="fas fa-file-pdf"></i> Exporter en PDF
    </button>
  );
};

export default ReportExport; 