<template>
  <div class="ticket-management">
    <div class="filters mb-4">
      <div class="row">
        <div class="col-md-3">
          <select v-model="filters.statut" class="form-select" @change="applyFilters">
            <option value="">Tous les statuts</option>
            <option v-for="statut in statuts" :key="statut.id" :value="statut.id">
              {{ statut.designation }}
            </option>
          </select>
        </div>
        <div class="col-md-3">
          <select v-model="filters.priorite" class="form-select" @change="applyFilters">
            <option value="">Toutes les priorités</option>
            <option v-for="priorite in priorites" :key="priorite.id" :value="priorite.id">
              {{ priorite.designation }}
            </option>
          </select>
        </div>
        <div class="col-md-3">
          <input 
            type="date" 
            v-model="filters.dateDebut" 
            class="form-control" 
            @change="applyFilters"
            placeholder="Date début"
          >
        </div>
        <div class="col-md-3">
          <input 
            type="date" 
            v-model="filters.dateFin" 
            class="form-control" 
            @change="applyFilters"
            placeholder="Date fin"
          >
        </div>
      </div>
    </div>

    <div class="tickets-list">
      <div v-if="loading" class="text-center">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
      </div>
      
      <div v-else-if="tickets.length === 0" class="alert alert-info">
        Aucun ticket trouvé
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>ID</th>
              <th>Titre</th>
              <th>Statut</th>
              <th>Priorité</th>
              <th>Date début</th>
              <th>Date fin prévue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ticket in tickets" :key="ticket.id">
              <td>{{ ticket.id }}</td>
              <td>{{ ticket.titre }}</td>
              <td>
                <span :class="getStatusClass(ticket.statut)">
                  {{ ticket.statut.designation }}
                </span>
              </td>
              <td>
                <span :class="getPriorityClass(ticket.priorite)">
                  {{ ticket.priorite.designation }}
                </span>
              </td>
              <td>{{ formatDate(ticket.dateDebut) }}</td>
              <td>{{ formatDate(ticket.dateFinPrevue) }}</td>
              <td>
                <button 
                  class="btn btn-sm btn-primary me-2"
                  @click="editTicket(ticket)"
                >
                  Modifier
                </button>
                <button 
                  class="btn btn-sm btn-danger"
                  @click="deleteTicket(ticket.id)"
                >
                  Supprimer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-4">
        <div>
          <select v-model="perPage" class="form-select" @change="applyFilters">
            <option value="10">10 par page</option>
            <option value="20">20 par page</option>
            <option value="50">50 par page</option>
          </select>
        </div>
        <nav v-if="totalPages > 1">
          <ul class="pagination">
            <li class="page-item" :class="{ disabled: currentPage === 1 }">
              <a class="page-link" href="#" @click.prevent="changePage(currentPage - 1)">Précédent</a>
            </li>
            <li 
              v-for="page in displayedPages" 
              :key="page"
              class="page-item"
              :class="{ active: currentPage === page }"
            >
              <a class="page-link" href="#" @click.prevent="changePage(page)">{{ page }}</a>
            </li>
            <li class="page-item" :class="{ disabled: currentPage === totalPages }">
              <a class="page-link" href="#" @click.prevent="changePage(currentPage + 1)">Suivant</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>

    <!-- Modal d'édition -->
    <div class="modal fade" id="editTicketModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Modifier le ticket</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="updateTicket">
              <div class="mb-3">
                <label class="form-label">Titre</label>
                <input type="text" class="form-control" v-model="editingTicket.titre" required>
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea class="form-control" v-model="editingTicket.description" rows="3"></textarea>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">Statut</label>
                    <select class="form-select" v-model="editingTicket.id_statut" required>
                      <option v-for="statut in statuts" :key="statut.id" :value="statut.id">
                        {{ statut.designation }}
                      </option>
                    </select>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">Priorité</label>
                    <select class="form-select" v-model="editingTicket.id_priorite" required>
                      <option v-for="priorite in priorites" :key="priorite.id" :value="priorite.id">
                        {{ priorite.designation }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
            <button type="button" class="btn btn-primary" @click="updateTicket">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default {
  name: 'TicketManagement',
  
  setup() {
    const tickets = ref([])
    const loading = ref(false)
    const statuts = ref([])
    const priorites = ref([])
    const filters = ref({
      statut: '',
      priorite: '',
      dateDebut: '',
      dateFin: ''
    })
    const currentPage = ref(1)
    const perPage = ref(20)
    const totalPages = ref(1)
    const editingTicket = ref(null)
    const modal = ref(null)

    // Computed properties
    const displayedPages = computed(() => {
      const pages = []
      const maxPages = 5
      let start = Math.max(1, currentPage.value - Math.floor(maxPages / 2))
      let end = Math.min(totalPages.value, start + maxPages - 1)
      
      if (end - start + 1 < maxPages) {
        start = Math.max(1, end - maxPages + 1)
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      return pages
    })

    // Methods
    const fetchTickets = async () => {
      loading.value = true
      try {
        const params = {
          page: currentPage.value,
          per_page: perPage.value,
          ...filters.value
        }
        
        const response = await axios.get('/api/tickets', { params })
        tickets.value = response.data.data
        totalPages.value = response.data.last_page
      } catch (error) {
        console.error('Erreur lors du chargement des tickets:', error)
      } finally {
        loading.value = false
      }
    }

    const fetchOptions = async () => {
      try {
        const response = await axios.get('/api/tickets/options')
        statuts.value = response.data.statuts
        priorites.value = response.data.priorites
      } catch (error) {
        console.error('Erreur lors du chargement des options:', error)
      }
    }

    const applyFilters = () => {
      currentPage.value = 1
      fetchTickets()
    }

    const changePage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
        fetchTickets()
      }
    }

    const editTicket = (ticket) => {
      editingTicket.value = { ...ticket }
      modal.value.show()
    }

    const updateTicket = async () => {
      try {
        await axios.put(`/api/tickets/${editingTicket.value.id}`, editingTicket.value)
        modal.value.hide()
        fetchTickets()
      } catch (error) {
        console.error('Erreur lors de la mise à jour du ticket:', error)
      }
    }

    const deleteTicket = async (id) => {
      if (confirm('Êtes-vous sûr de vouloir supprimer ce ticket ?')) {
        try {
          await axios.delete(`/api/tickets/${id}`)
          fetchTickets()
        } catch (error) {
          console.error('Erreur lors de la suppression du ticket:', error)
        }
      }
    }

    const formatDate = (date) => {
      if (!date) return ''
      return format(new Date(date), 'dd/MM/yyyy', { locale: fr })
    }

    const getStatusClass = (statut) => {
      const classes = {
        'En cours': 'badge bg-primary',
        'En instance': 'badge bg-warning',
        'Clôturé': 'badge bg-success'
      }
      return classes[statut.designation] || 'badge bg-secondary'
    }

    const getPriorityClass = (priorite) => {
      const classes = {
        'Basse': 'badge bg-success',
        'Moyenne': 'badge bg-warning',
        'Haute': 'badge bg-danger'
      }
      return classes[priorite.designation] || 'badge bg-secondary'
    }

    // Lifecycle hooks
    onMounted(() => {
      fetchOptions()
      fetchTickets()
      modal.value = new bootstrap.Modal(document.getElementById('editTicketModal'))
    })

    return {
      tickets,
      loading,
      statuts,
      priorites,
      filters,
      currentPage,
      perPage,
      totalPages,
      displayedPages,
      editingTicket,
      applyFilters,
      changePage,
      editTicket,
      updateTicket,
      deleteTicket,
      formatDate,
      getStatusClass,
      getPriorityClass
    }
  }
}
</script>

<style scoped>
.ticket-management {
  padding: 20px;
}

.filters {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
}

.table th {
  background-color: #f8f9fa;
}

.badge {
  padding: 5px 10px;
  font-size: 0.9em;
}

.pagination {
  margin-bottom: 0;
}
</style> 