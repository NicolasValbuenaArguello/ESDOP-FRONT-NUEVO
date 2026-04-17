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
  this.http.get<any[]>(`${environment.apiUrl_2}/grados`, this.api['headers']()).subscribe({
    next: (res) => this.grados = res,
    error: (err) => {
      console.error(err);
      this.grados = [];
    }
  });
}
  cargarRoles() {
    this.http.get<any[]>(`${environment.apiUrl_2}/roles`,this.api['headers']()).subscribe({
      next: (res) => this.rolesDisponibles = res,
      error: () => this.rolesDisponibles = []
    });
  }
  cargarPaginas() {
    this.http.get<any[]>(`${environment.apiUrl_2}/paginas`,this.api['headers']()).subscribe({
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
    // Si grados no está cargado, vuelve a cargar
    if (!this.grados || this.grados.length === 0) {
      this.cargarGrados();
    }
    // Mapear permisos del backend a la estructura de checkboxes
    this.permisosPaginas = this.paginasDisponibles.map(p => {
      const perm = u?.permisos?.[p.ruta] || {};
      return {
        pagina: p.ruta,
        ver: perm.ver ?? false,
        crear: perm.crear ?? false,
        editar: perm.editar ?? false,
        eliminar: perm.eliminar ?? false
      };
    });
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
    // Agregar permisos al payload
    const payload = {
      ...this.usuarioForm,
      permisos: this.permisosPaginas.reduce((acc, p) => {
        acc[p.pagina] = {
          ver: p.ver,
          crear: p.crear,
          editar: p.editar,
          eliminar: p.eliminar
        };
        return acc;
      }, {})
    };
    const req = this.usuarioForm.id
      ? this.api.update(payload)
      : this.api.create(payload);
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
      roles: [],
      grado_id: undefined
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