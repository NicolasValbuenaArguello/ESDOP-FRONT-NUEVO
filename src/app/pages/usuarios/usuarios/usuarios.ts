import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/sidebar/sidebar.component';
import { UsuariosService, Usuario } from './usuarios.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css'],
  imports: [CommonModule, FormsModule, SidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuariosComponent implements OnInit {

  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  usuarioForm: Usuario = this.resetForm();
  rolesInput = '';
  loading = false;
  error = '';
  success = '';
  mostrarModal = false;
  mostrarConfirm = false;
  mostrarPermisos = false;
  usuarioAEliminar: Usuario | null = null;
  search = '';
  grados: any[] = [];
  rolesDisponibles: any[] = [];
  paginasDisponibles: any[] = [];
  permisosPaginas: any[] = [];

  constructor(private api: UsuariosService, private http: HttpClient) {}

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarGrados();
    this.cargarRoles();
    this.cargarPaginas();
  }

  cargarGrados() {
    this.http.get<any[]>(`${environment.apiUrl}/grados`).subscribe({
      next: (res) => this.grados = res,
      error: () => this.grados = []
    });
  }
  cargarRoles() {
    this.http.get<any[]>(`${environment.apiUrl}/roles`).subscribe({
      next: (res) => this.rolesDisponibles = res,
      error: () => this.rolesDisponibles = []
    });
  }
  cargarPaginas() {
    this.http.get<any[]>(`${environment.apiUrl}/paginas`).subscribe({
      next: (res) => this.paginasDisponibles = res,
      error: () => this.paginasDisponibles = []
    });
  }

  cargarUsuarios() {
    this.loading = true;
    this.api.getAll().subscribe({
      next: (res) => {
        this.usuarios = res;
        this.filtrar();
        this.loading = false;
      },
      error: () => {
        this.error = 'Error cargando usuarios';
        this.loading = false;
      }
    });
  }

  filtrar() {
    const s = this.search.toLowerCase();
    this.usuariosFiltrados = this.usuarios.filter(u =>
      u.nombre?.toLowerCase().includes(s) ||
      u.usuario?.toLowerCase().includes(s)
    );
  }

  abrirModal(u?: Usuario) {
    this.usuarioForm = u
      ? { ...u, password: '' }
      : this.resetForm();
    this.rolesInput = u?.roles?.join(',') || '';
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  guardarUsuario() {
    this.loading = true;
    this.usuarioForm.roles = this.rolesInput
      ? this.rolesInput.split(',').map(r => r.trim())
      : [];
    const req = this.usuarioForm.id
      ? this.api.update(this.usuarioForm)
      : this.api.create(this.usuarioForm);
    req.subscribe({
      next: () => {
        this.success = 'Guardado correctamente';
        this.cargarUsuarios();
        this.cerrarModal();
      },
      error: () => {
        this.error = 'Error al guardar';
        this.loading = false;
      }
    });
  }

  confirmarEliminar(u: Usuario) {
    this.usuarioAEliminar = u;
    this.mostrarConfirm = true;
  }

  eliminarUsuario() {
    if (!this.usuarioAEliminar) return;

    this.api.delete(this.usuarioAEliminar.id!).subscribe(() => {
      this.success = 'Eliminado';
      this.cargarUsuarios();
      this.mostrarConfirm = false;
    });
  }

  resetForm(): Usuario {
    return {
      nombre: '',
      usuario: '',
      password: '',
      email: '',
      unidad: '',
      nivel_per_uni: '',
      unida_per: '',
      roles: []
    };
  }

  abrirPermisos(u: Usuario) {
    this.usuarioForm = { ...u };
    // Cargar permisos de todas las páginas
    this.permisosPaginas = this.paginasDisponibles.map(p => ({
      pagina: p.ruta,
      ver: false,
      crear: false,
      editar: false,
      eliminar: false
    }));
    this.mostrarModal = false;
    this.mostrarPermisos = true;
  }
}