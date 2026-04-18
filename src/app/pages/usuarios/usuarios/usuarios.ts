import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../../shared/sidebar/sidebar.component';
import { Grado, Pagina, PermisoPagina, Rol, UsuariosService, Usuario } from './usuarios.service';

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
  loading = false;
  error = '';
  success = '';
  mostrarModal = false;
  mostrarConfirm = false;
  mostrarPermisos = false;
  usuarioAEliminar: Usuario | null = null;
  search = '';
  errorGrados = '';
  grados: Grado[] = [];
  rolesDisponibles: Rol[] = [];
  paginasDisponibles: Pagina[] = [];
  permisosPaginas: Array<{
    pagina: string;
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
  }> = [];

  constructor(
    private api: UsuariosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarGrados();
    this.cargarRoles();
    this.cargarPaginas();
  }

  private obtenerGradoId(usuario?: Usuario) {
    const gradoPlano = (usuario as Usuario & { grado?: number | { id?: number } })?.grado;

    if (typeof usuario?.grado_id === 'number') {
      return usuario.grado_id;
    }

    if (typeof gradoPlano === 'number') {
      return gradoPlano;
    }

    if (gradoPlano && typeof gradoPlano === 'object' && typeof gradoPlano.id === 'number') {
      return gradoPlano.id;
    }

    return undefined;
  }

  private obtenerRutasPermisos(usuario?: Usuario) {
    const rutasPaginas = this.paginasDisponibles.map((pagina) => pagina.ruta);
    const rutasBackend = Object.keys(usuario?.permisos || {});
    return Array.from(new Set([...rutasBackend, ...rutasPaginas]));
  }

  private normalizarPermiso(permiso?: PermisoPagina) {
    return {
      ver: permiso?.['ver'] ?? permiso?.['puede_ver'] ?? permiso?.['tiene_permiso'] ?? false,
      crear: permiso?.['crear'] ?? permiso?.['puede_crear'] ?? false,
      editar: permiso?.['editar'] ?? permiso?.['puede_editar'] ?? false,
      eliminar: permiso?.['eliminar'] ?? permiso?.['puede_eliminar'] ?? false
    };
  }

  private construirPermisosPaginas(usuario?: Usuario) {
    return this.obtenerRutasPermisos(usuario).map((ruta) => {
      const permiso = this.normalizarPermiso(usuario?.permisos?.[ruta]);
      return {
        pagina: ruta,
        ...permiso
      };
    });
  }

  private construirPayloadPermisos() {
    return this.permisosPaginas.reduce<Record<string, {
      puede_ver: boolean;
      puede_crear: boolean;
      puede_editar: boolean;
      puede_eliminar: boolean;
    }>>((acc, permiso) => {
      acc[permiso.pagina] = {
        puede_ver: permiso.ver,
        puede_crear: permiso.crear,
        puede_editar: permiso.editar,
        puede_eliminar: permiso.eliminar
      };
      return acc;
    }, {});
  }

  tienePermisosActivos(permiso: { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean }) {
    return permiso.ver || permiso.crear || permiso.editar || permiso.eliminar;
  }

  private normalizarUsuario(usuario: Usuario): Usuario {
    const permisos = Object.entries(usuario.permisos || {}).reduce<Usuario['permisos']>((acc, [ruta, permiso]) => {
      if (!acc) {
        acc = {};
      }

      acc[ruta] = this.normalizarPermiso(permiso);
      return acc;
    }, {});

    return {
      ...usuario,
      grado_id: this.obtenerGradoId(usuario),
      permisos,
      roles: usuario.roles || []
    };
  }

  cargarGrados() {
    this.errorGrados = '';
    this.api.getGrados().subscribe({
      next: (res) => {
        this.grados = res;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.grados = [];
        this.errorGrados = 'No se pudieron cargar los grados';
        this.cdr.markForCheck();
      }
    });
  }

  cargarRoles() {
    this.api.getRoles().subscribe({
      next: (res) => {
        this.rolesDisponibles = res;
        this.cdr.markForCheck();
      },
      error: () => {
        this.rolesDisponibles = [];
        this.cdr.markForCheck();
      }
    });
  }

  cargarPaginas() {
    this.api.getPaginas().subscribe({
      next: (res) => {
        this.paginasDisponibles = res;

        if (this.mostrarModal) {
          this.permisosPaginas = this.construirPermisosPaginas(this.usuarioForm);
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.paginasDisponibles = [];
        this.cdr.markForCheck();
      }
    });
  }

  cargarUsuarios() {
    this.loading = true;
    this.api.getAll().subscribe({
      next: (res) => {
        this.usuarios = res.map((usuario) => this.normalizarUsuario(usuario));
        this.filtrar();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Error cargando usuarios';
        this.loading = false;
        this.cdr.markForCheck();
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
    this.error = '';
    this.success = '';
    const usuarioNormalizado = u ? this.normalizarUsuario(u) : undefined;
    this.usuarioForm = usuarioNormalizado
      ? { ...usuarioNormalizado, password: '' }
      : this.resetForm();
    // Si grados no está cargado, vuelve a cargar
    if (!this.grados || this.grados.length === 0) {
      this.cargarGrados();
    }
    // Mapear permisos del backend a la estructura de checkboxes
    this.permisosPaginas = this.construirPermisosPaginas(usuarioNormalizado);
    this.mostrarModal = true;
    this.cdr.markForCheck();
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.mostrarPermisos = false;
  }

  abrirPermisosModal() {
    this.mostrarPermisos = true;
    this.cdr.markForCheck();
  }

  cerrarPermisosModal() {
    this.mostrarPermisos = false;
    this.cdr.markForCheck();
  }

  guardarUsuario() {
    this.loading = true;

    const permisos = this.construirPayloadPermisos();
    const roles = this.usuarioForm.roles || [];

    const req = this.usuarioForm.id
      ? this.api.update(this.usuarioForm.id, {
          nombre: this.usuarioForm.nombre,
          email: this.usuarioForm.email,
          unidad: this.usuarioForm.unidad,
          nivel_per_uni: this.usuarioForm.nivel_per_uni,
          unida_per: this.usuarioForm.unida_per,
          roles,
          permisos
        })
      : this.api.create({
          nombre: this.usuarioForm.nombre,
          usuario: this.usuarioForm.usuario,
          password: this.usuarioForm.password || '',
          email: this.usuarioForm.email,
          unidad: this.usuarioForm.unidad,
          nivel_per_uni: this.usuarioForm.nivel_per_uni,
          unida_per: this.usuarioForm.unida_per,
          roles,
          permisos
        });

    req.subscribe({
      next: () => {
        this.success = this.usuarioForm.id
          ? 'Usuario actualizado correctamente'
          : 'Usuario creado correctamente';
        this.cargarUsuarios();
        this.cerrarModal();
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.error = this.usuarioForm.id
          ? 'Error al actualizar el usuario'
          : 'Error al crear el usuario';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  confirmarEliminar(u: Usuario) {
    this.usuarioAEliminar = u;
    this.mostrarConfirm = true;
    this.cdr.markForCheck();
  }

  eliminarUsuario() {
    if (!this.usuarioAEliminar) return;

    this.api.delete(this.usuarioAEliminar.id!).subscribe({
      next: () => {
        this.success = 'Usuario eliminado correctamente';
        this.cargarUsuarios();
        this.mostrarConfirm = false;
        this.usuarioAEliminar = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.error = 'Error al eliminar el usuario';
        this.mostrarConfirm = false;
        this.usuarioAEliminar = null;
        this.cdr.markForCheck();
      }
    });
  }

  cancelarEliminar() {
    this.mostrarConfirm = false;
    this.usuarioAEliminar = null;
    this.cdr.markForCheck();
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
      grado_id: undefined,
      roles: []
    };
  }

  abrirPermisos(u: Usuario) {
    this.abrirModal(u);
    this.mostrarPermisos = true;
    this.cdr.markForCheck();
  }
}