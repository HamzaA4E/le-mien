<template>
  <div class="report-export">
    <button @click="exportToPDF" class="btn btn-primary">
      <i class="fas fa-file-pdf"></i> Exporter en PDF
    </button>
  </div>
</template>

<script>
import html2pdf from 'html2pdf.js'

export default {
  name: 'ReportExport',
  props: {
    reportTitle: {
      type: String,
      required: true
    },
    reportDate: {
      type: String,
      required: true
    }
  },
  methods: {
    async exportToPDF() {
      // Configuration de l'export PDF
      const opt = {
        margin: 1,
        filename: `rapport_${this.reportTitle}_${this.reportDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: true
        },
        jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
      }

      // Sélectionner le contenu à exporter
      const element = document.querySelector('.report-content')
      
      // Ajouter un en-tête au PDF
      const header = document.createElement('div')
      header.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
          <h1>${this.reportTitle}</h1>
          <p>Date du rapport: ${this.reportDate}</p>
        </div>
      `
      element.insertBefore(header, element.firstChild)

      try {
        // Générer le PDF
        await html2pdf().set(opt).from(element).save()
        
        // Supprimer l'en-tête après l'export
        element.removeChild(header)
      } catch (error) {
        console.error('Erreur lors de l\'export PDF:', error)
        alert('Une erreur est survenue lors de l\'export du PDF')
      }
    }
  }
}
</script>

<style scoped>
.report-export {
  margin: 20px 0;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fas {
  font-size: 1.1em;
}
</style> 