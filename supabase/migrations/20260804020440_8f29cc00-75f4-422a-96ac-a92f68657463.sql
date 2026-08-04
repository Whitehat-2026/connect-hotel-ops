
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','gerente','supervisor','colaborador');
CREATE TYPE public.prioridad AS ENUM ('baja','media','alta','critica');
CREATE TYPE public.estado_incidencia AS ENUM ('abierta','en_proceso','escalada','resuelta','cerrada');
CREATE TYPE public.confidencialidad AS ENUM ('interno','restringido');
CREATE TYPE public.estado_pedido AS ENUM ('solicitado','aprobado','rechazado','en_proceso','entregado','cerrado');

-- UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- AREAS
CREATE TABLE public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  codigo text NOT NULL UNIQUE,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT ALL ON public.areas TO service_role;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT 'Colaborador',
  email text,
  puesto text,
  telefono text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_area ON public.profiles(area_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.es_gerencia(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','gerente'));
$$;

CREATE OR REPLACE FUNCTION public.area_usuario(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT area_id FROM public.profiles WHERE id = _user_id;
$$;

-- INCIDENTS
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  ubicacion text,
  prioridad public.prioridad NOT NULL DEFAULT 'media',
  estado public.estado_incidencia NOT NULL DEFAULT 'abierta',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  asignado_a uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  primera_respuesta_at timestamptz,
  resuelta_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_incidents_area ON public.incidents(area_id);
CREATE INDEX idx_incidents_estado ON public.incidents(estado);
CREATE INDEX idx_incidents_prioridad ON public.incidents(prioridad);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SHIFT HANDOVERS
CREATE TABLE public.shift_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  turno text NOT NULL DEFAULT 'matutino',
  fecha date NOT NULL DEFAULT current_date,
  pendientes text,
  vips text,
  incidencias_abiertas text,
  notas text,
  firma_entrega text,
  firma_recepcion text,
  entregado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recibido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_handovers_area ON public.shift_handovers(area_id);
CREATE INDEX idx_handovers_fecha ON public.shift_handovers(fecha);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_handovers TO authenticated;
GRANT ALL ON public.shift_handovers TO service_role;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_handovers_updated BEFORE UPDATE ON public.shift_handovers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  cuerpo text NOT NULL,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  confidencialidad public.confidencialidad NOT NULL DEFAULT 'interno',
  prioridad public.prioridad NOT NULL DEFAULT 'media',
  requiere_lectura boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_announcements_area ON public.announcements(area_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leido_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reads TO authenticated;
GRANT ALL ON public.announcement_reads TO service_role;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- VIP ALERTS
CREATE TABLE public.vip_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  huesped text NOT NULL,
  habitacion text,
  preferencias text,
  alergias text,
  restricciones text,
  areas_involucradas text[] NOT NULL DEFAULT '{}',
  llegada date,
  salida date,
  prioridad public.prioridad NOT NULL DEFAULT 'alta',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_alerts TO authenticated;
GRANT ALL ON public.vip_alerts TO service_role;
ALTER TABLE public.vip_alerts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_vip_updated BEFORE UPDATE ON public.vip_alerts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CHECKLISTS
CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  turno text NOT NULL DEFAULT 'matutino',
  fecha date NOT NULL DEFAULT current_date,
  responsable uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklists_area ON public.checklists(area_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklists TO authenticated;
GRANT ALL ON public.checklists TO service_role;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_checklists_updated BEFORE UPDATE ON public.checklists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  descripcion text NOT NULL,
  orden int NOT NULL DEFAULT 0,
  completado boolean NOT NULL DEFAULT false,
  completado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completado_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_items_checklist ON public.checklist_items(checklist_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT ALL ON public.checklist_items TO service_role;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_checklist_items_updated BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INTERNAL REQUESTS
CREATE TABLE public.internal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  detalle text,
  area_solicitante uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  area_destino uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  prioridad public.prioridad NOT NULL DEFAULT 'media',
  estado public.estado_pedido NOT NULL DEFAULT 'solicitado',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprobado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_requests_estado ON public.internal_requests(estado);
CREATE INDEX idx_requests_destino ON public.internal_requests(area_destino);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_requests TO authenticated;
GRANT ALL ON public.internal_requests TO service_role;
ALTER TABLE public.internal_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.internal_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- POLICIES
CREATE POLICY "areas visibles" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "areas gestion" ON public.areas FOR ALL TO authenticated USING (public.es_gerencia(auth.uid())) WITH CHECK (public.es_gerencia(auth.uid()));

CREATE POLICY "perfiles visibles" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.es_gerencia(auth.uid()) OR area_id = public.area_usuario(auth.uid()));
CREATE POLICY "perfil propio" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "perfiles admin" ON public.profiles FOR ALL TO authenticated
USING (public.es_gerencia(auth.uid())) WITH CHECK (public.es_gerencia(auth.uid()));

CREATE POLICY "roles propios" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.es_gerencia(auth.uid()));
CREATE POLICY "roles admin" ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "incidencias lectura" ON public.incidents FOR SELECT TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid() OR asignado_a = auth.uid() OR area_id = public.area_usuario(auth.uid()));
CREATE POLICY "incidencias alta" ON public.incidents FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "incidencias edicion" ON public.incidents FOR UPDATE TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid() OR asignado_a = auth.uid() OR area_id = public.area_usuario(auth.uid()));
CREATE POLICY "incidencias borrado" ON public.incidents FOR DELETE TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "turnos lectura" ON public.shift_handovers FOR SELECT TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid() OR area_id = public.area_usuario(auth.uid()));
CREATE POLICY "turnos alta" ON public.shift_handovers FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "turnos edicion" ON public.shift_handovers FOR UPDATE TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid() OR area_id = public.area_usuario(auth.uid()));
CREATE POLICY "turnos borrado" ON public.shift_handovers FOR DELETE TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "comunicados lectura" ON public.announcements FOR SELECT TO authenticated
USING (
  public.es_gerencia(auth.uid())
  OR created_by = auth.uid()
  OR (confidencialidad = 'interno' AND (area_id IS NULL OR area_id = public.area_usuario(auth.uid())))
  OR (confidencialidad = 'restringido' AND area_id = public.area_usuario(auth.uid()))
);
CREATE POLICY "comunicados gestion" ON public.announcements FOR ALL TO authenticated
USING (public.es_gerencia(auth.uid()) OR public.has_role(auth.uid(),'supervisor'))
WITH CHECK (public.es_gerencia(auth.uid()) OR public.has_role(auth.uid(),'supervisor'));

CREATE POLICY "lecturas propias" ON public.announcement_reads FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.es_gerencia(auth.uid())) WITH CHECK (user_id = auth.uid());

CREATE POLICY "vip solo gerencia" ON public.vip_alerts FOR ALL TO authenticated
USING (public.es_gerencia(auth.uid())) WITH CHECK (public.es_gerencia(auth.uid()));

CREATE POLICY "checklists lectura" ON public.checklists FOR SELECT TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid() OR responsable = auth.uid() OR area_id = public.area_usuario(auth.uid()));
CREATE POLICY "checklists gestion" ON public.checklists FOR ALL TO authenticated
USING (public.es_gerencia(auth.uid()) OR area_id = public.area_usuario(auth.uid()))
WITH CHECK (public.es_gerencia(auth.uid()) OR area_id = public.area_usuario(auth.uid()));

CREATE POLICY "items lectura" ON public.checklist_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.checklists c WHERE c.id = checklist_id
  AND (public.es_gerencia(auth.uid()) OR c.created_by = auth.uid() OR c.responsable = auth.uid() OR c.area_id = public.area_usuario(auth.uid()))));
CREATE POLICY "items gestion" ON public.checklist_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.checklists c WHERE c.id = checklist_id
  AND (public.es_gerencia(auth.uid()) OR c.area_id = public.area_usuario(auth.uid()) OR c.responsable = auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.checklists c WHERE c.id = checklist_id
  AND (public.es_gerencia(auth.uid()) OR c.area_id = public.area_usuario(auth.uid()) OR c.responsable = auth.uid())));

CREATE POLICY "pedidos lectura" ON public.internal_requests FOR SELECT TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid()
  OR area_solicitante = public.area_usuario(auth.uid()) OR area_destino = public.area_usuario(auth.uid()));
CREATE POLICY "pedidos alta" ON public.internal_requests FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "pedidos edicion" ON public.internal_requests FOR UPDATE TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid()
  OR area_solicitante = public.area_usuario(auth.uid()) OR area_destino = public.area_usuario(auth.uid()));
CREATE POLICY "pedidos borrado" ON public.internal_requests FOR DELETE TO authenticated
USING (public.es_gerencia(auth.uid()) OR created_by = auth.uid());

-- NUEVO USUARIO: perfil + rol
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_area uuid; v_role public.app_role;
BEGIN
  SELECT id INTO v_area FROM public.areas WHERE codigo = 'AYB' LIMIT 1;
  INSERT INTO public.profiles (id, nombre, email, area_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), NEW.email, v_area)
  ON CONFLICT (id) DO NOTHING;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    v_role := 'colaborador';
  ELSE
    v_role := 'admin';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SEED
INSERT INTO public.areas (nombre, codigo, descripcion) VALUES
  ('Alimentos y Bebidas','AYB','Restaurantes, bares, banquetes y room service'),
  ('Cocina','COC','Cocina principal, pastelería y steward'),
  ('Ama de Llaves','AML','Habitaciones, áreas públicas y lavandería'),
  ('Recepción','REC','Front desk, concierge y botones'),
  ('Mantenimiento','MTO','Ingeniería y mantenimiento preventivo'),
  ('Seguridad','SEG','Vigilancia y control de accesos'),
  ('Spa y Wellness','SPA','Spa, gimnasio y albercas'),
  ('Gerencia','GER','Dirección general y jefaturas');

INSERT INTO public.announcements (titulo, cuerpo, area_id, confidencialidad, prioridad) VALUES
  ('Nueva carta de temporada','A partir del lunes entra en vigor la carta de otoño. Briefing obligatorio 10:00 en el privado del restaurante.', (SELECT id FROM public.areas WHERE codigo='AYB'), 'interno','alta'),
  ('Auditoría de estándares LQA','Se realizará auditoría externa durante la próxima semana. Revisar uniformidad y protocolos de servicio.', NULL, 'interno','critica'),
  ('Protocolo de alérgenos','Toda comanda con alergia declarada debe confirmarse por escrito con el chef de partida.', (SELECT id FROM public.areas WHERE codigo='COC'),'restringido','alta'),
  ('Cambio de horario de lavandería','La lavandería operará de 06:00 a 22:00 a partir del día 15.', (SELECT id FROM public.areas WHERE codigo='AML'),'interno','media');

INSERT INTO public.incidents (titulo, descripcion, area_id, ubicacion, prioridad, estado, primera_respuesta_at, resuelta_at) VALUES
  ('Fuga en cámara de refrigeración','Goteo constante en la cámara 2 de cocina fría.', (SELECT id FROM public.areas WHERE codigo='MTO'),'Cocina fría','critica','en_proceso', now() - interval '40 minutes', NULL),
  ('Retraso en room service','Tiempo de entrega superior a 45 min en piso 7.', (SELECT id FROM public.areas WHERE codigo='AYB'),'Piso 7','alta','abierta', NULL, NULL),
  ('Aire acondicionado hab. 812','Huésped reporta ruido en el fan coil.', (SELECT id FROM public.areas WHERE codigo='MTO'),'Habitación 812','media','resuelta', now() - interval '3 hours', now() - interval '1 hour'),
  ('Falta de mantelería','Inventario insuficiente para banquete de 120 pax.', (SELECT id FROM public.areas WHERE codigo='AML'),'Salón Vestíbulo','alta','escalada', now() - interval '20 minutes', NULL),
  ('Copa rota en terraza','Cristalería rota en terraza del bar, área ya asegurada.', (SELECT id FROM public.areas WHERE codigo='AYB'),'Terraza bar','baja','cerrada', now() - interval '5 hours', now() - interval '4 hours');

INSERT INTO public.shift_handovers (area_id, turno, pendientes, vips, incidencias_abiertas, notas, firma_entrega) VALUES
  ((SELECT id FROM public.areas WHERE codigo='AYB'),'matutino','Montaje de terraza para cena maridaje; reponer cristalería.','Sr. Lombardi (Suite 1201) — alergia a mariscos.','Retraso en room service piso 7.','Turno cerrado sin quejas escritas.','C. Herrera'),
  ((SELECT id FROM public.areas WHERE codigo='COC'),'vespertino','Preparar mise en place para 180 cubiertos.','Mesa 12 celebración aniversario.','Fuga en cámara de refrigeración.','Pendiente pedido de proveedor de pescado.','L. Márquez'),
  ((SELECT id FROM public.areas WHERE codigo='REC'),'nocturno','Auditoría nocturna completada.','Llegada tardía Familia Duarte 23:40.','Ninguna.','Sin incidencias de seguridad.','M. Ortiz');

INSERT INTO public.vip_alerts (huesped, habitacion, preferencias, alergias, restricciones, areas_involucradas, llegada, salida, prioridad) VALUES
  ('Sr. Alessandro Lombardi','Suite 1201','Champagne Ruinart al check-in, almohada de plumas.','Mariscos','No contacto con prensa','{"AYB","AML","REC"}', current_date, current_date + 3,'critica'),
  ('Dra. Helena Fischer','Suite 905','Té verde matcha, temperatura 20°C.','Gluten','Dieta celiaca estricta','{"COC","AYB"}', current_date, current_date + 2,'alta'),
  ('Familia Duarte','Habitaciones 610-612','Cuna adicional, menú infantil.','Lactosa (menor)','Sin frutos secos en habitación','{"AML","AYB"}', current_date + 1, current_date + 5,'media');

WITH c AS (
  INSERT INTO public.checklists (nombre, area_id, turno) VALUES
   ('Apertura de restaurante', (SELECT id FROM public.areas WHERE codigo='AYB'),'matutino'),
   ('Cierre de cocina', (SELECT id FROM public.areas WHERE codigo='COC'),'nocturno'),
   ('Inspección de habitaciones VIP', (SELECT id FROM public.areas WHERE codigo='AML'),'matutino')
  RETURNING id, nombre
)
INSERT INTO public.checklist_items (checklist_id, descripcion, orden, completado)
SELECT c.id, x.descripcion, x.orden, x.completado FROM c
JOIN (VALUES
  ('Apertura de restaurante','Verificar montaje y mantelería',1,true),
  ('Apertura de restaurante','Briefing de carta del día',2,true),
  ('Apertura de restaurante','Revisar temperatura de cámaras',3,false),
  ('Apertura de restaurante','Control de cristalería y cubertería',4,false),
  ('Cierre de cocina','Limpieza profunda de estaciones',1,true),
  ('Cierre de cocina','Registro de temperaturas HACCP',2,false),
  ('Cierre de cocina','Rotación de inventario PEPS',3,false),
  ('Inspección de habitaciones VIP','Amenidades de bienvenida colocadas',1,true),
  ('Inspección de habitaciones VIP','Verificar preferencias registradas',2,true),
  ('Inspección de habitaciones VIP','Prueba de climatización e iluminación',3,false)
) AS x(nombre, descripcion, orden, completado) ON x.nombre = c.nombre;

INSERT INTO public.internal_requests (titulo, detalle, area_solicitante, area_destino, prioridad, estado) VALUES
  ('Reposición de cristalería','Se requieren 60 copas de vino tinto para banquete.', (SELECT id FROM public.areas WHERE codigo='AYB'), (SELECT id FROM public.areas WHERE codigo='AML'),'alta','aprobado'),
  ('Reparación de horno combi','Horno 2 no alcanza temperatura.', (SELECT id FROM public.areas WHERE codigo='COC'), (SELECT id FROM public.areas WHERE codigo='MTO'),'critica','en_proceso'),
  ('Amenidades VIP adicionales','Kit de bienvenida para suite 905.', (SELECT id FROM public.areas WHERE codigo='REC'), (SELECT id FROM public.areas WHERE codigo='AML'),'media','solicitado'),
  ('Refuerzo de vigilancia','Evento privado en salón principal 20:00-01:00.', (SELECT id FROM public.areas WHERE codigo='AYB'), (SELECT id FROM public.areas WHERE codigo='SEG'),'alta','entregado');
