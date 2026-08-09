-- 1) Áreas
INSERT INTO public.areas (nombre, codigo, descripcion) VALUES
  ('Cocina','COC','Producción de alimentos'),
  ('Restaurante','RES','Servicio de sala y bar'),
  ('Recepción','REC','Front desk y conserjería'),
  ('Housekeeping','HSK','Pisos y áreas públicas'),
  ('Mantenimiento','MTO','Ingeniería y mantenimiento'),
  ('Eventos','EVE','Banquetes y eventos'),
  ('Administración','ADM','Gerencia y administración')
ON CONFLICT DO NOTHING;

-- 2) Cuentas de demostración con rol pre-asignado (no derivado del correo)
CREATE TABLE IF NOT EXISTS public.demo_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  area_codigo text,
  nombre text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.demo_accounts TO service_role;
ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo accounts solo admin" ON public.demo_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.demo_accounts (email, role, area_codigo, nombre) VALUES
  ('colaborador.demo@swissotelquito.com','colaborador','COC','Ana Colaboradora (demo)'),
  ('supervisor.demo@swissotelquito.com','supervisor','COC','Luis Supervisor (demo)'),
  ('gerente.demo@swissotelquito.com','gerente','ADM','María Gerente (demo)'),
  ('admin.demo@swissotelquito.com','admin','ADM','Root Admin (demo)')
ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, area_codigo = EXCLUDED.area_codigo, nombre = EXCLUDED.nombre;

-- 3) Alta de usuarios: el rol proviene de demo_accounts, nunca del texto del correo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_demo public.demo_accounts%ROWTYPE;
  v_area uuid;
  v_role public.app_role := 'colaborador';
  v_nombre text;
BEGIN
  SELECT * INTO v_demo FROM public.demo_accounts WHERE lower(email) = lower(NEW.email);
  IF FOUND THEN
    v_role := v_demo.role;
    SELECT id INTO v_area FROM public.areas WHERE codigo = v_demo.area_codigo LIMIT 1;
    v_nombre := v_demo.nombre;
  END IF;
  IF v_area IS NULL THEN
    SELECT id INTO v_area FROM public.areas WHERE codigo = 'COC' LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, nombre, email, area_id)
  VALUES (NEW.id, COALESCE(v_nombre, NEW.raw_user_meta_data->>'nombre', split_part(NEW.email,'@',1)), NEW.email, v_area)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;

-- 4) Datos ficticios de demostración
INSERT INTO public.incidents (titulo, descripcion, area_id, ubicacion, prioridad, estado, created_at, primera_respuesta_at) VALUES
  ('Cámara frigorífica con temperatura fuera de rango','Cámara 2 marca 8°C. Se solicita revisión urgente de Mantenimiento.',(SELECT id FROM public.areas WHERE codigo='COC'),'Cocina caliente - Cámara 2','alta','en_proceso', now() - interval '5 hours', now() - interval '4 hours 25 minutes'),
  ('Reposición pendiente de insumos para servicio','Faltan mantelería y vajilla para el servicio de la cena.',(SELECT id FROM public.areas WHERE codigo='RES'),'Restaurante principal','media','abierta', now() - interval '3 hours', NULL),
  ('Revisión de equipamiento previo a evento','Verificar audio y proyección del salón antes del montaje.',(SELECT id FROM public.areas WHERE codigo='EVE'),'Salón Pichincha','media','en_proceso', now() - interval '2 hours', now() - interval '1 hour 10 minutes');

INSERT INTO public.shift_handovers (area_id, turno, fecha, pendientes, vips, incidencias_abiertas, notas, firma_entrega, firma_recepcion) VALUES
  ((SELECT id FROM public.areas WHERE codigo='COC'),'Matutino', CURRENT_DATE,'Cerrar inventario de cámara 2 y confirmar reposición de lácteos.','Mesa 12 con requerimiento sin gluten (referencia interna).','Cámara frigorífica en proceso con Mantenimiento.','Turno sin novedades adicionales.','Luis Supervisor (demo)',NULL),
  ((SELECT id FROM public.areas WHERE codigo='RES'),'Vespertino', CURRENT_DATE - 1,'Montaje de terraza para 40 pax.','Reserva corporativa confidencial en salón privado.','Reposición de insumos pendiente.','Se entrega caja cuadrada.','Ana Colaboradora (demo)','María Gerente (demo)');

INSERT INTO public.announcements (titulo, cuerpo, area_id, confidencialidad, prioridad, requiere_lectura) VALUES
  ('Actualización de procedimiento interno','A partir de hoy toda incidencia de A&B debe registrarse en la plataforma; se descontinúan los grupos de mensajería externos.',NULL,'interno','alta',true),
  ('Coordinación operativa para evento','Evento corporativo el viernes: montaje 14:00, prueba de audio 16:00, servicio 19:00. Cocina, Eventos y Restaurante coordinan por este canal.',(SELECT id FROM public.areas WHERE codigo='EVE'),'interno','media',true),
  ('Recordatorio de protocolo de seguridad','Refuerzo de control de accesos a áreas de servicio y manejo confidencial de información de huéspedes.',NULL,'interno','media',true);

WITH c1 AS (
  INSERT INTO public.checklists (nombre, area_id, turno, fecha) VALUES
    ('Apertura de cocina',(SELECT id FROM public.areas WHERE codigo='COC'),'matutino',CURRENT_DATE) RETURNING id
), c2 AS (
  INSERT INTO public.checklists (nombre, area_id, turno, fecha) VALUES
    ('Cierre de restaurante',(SELECT id FROM public.areas WHERE codigo='RES'),'nocturno',CURRENT_DATE) RETURNING id
)
INSERT INTO public.checklist_items (checklist_id, descripcion, orden, completado, completado_at)
SELECT id, d.descripcion, d.orden, d.completado, CASE WHEN d.completado THEN now() ELSE NULL END
FROM c1, (VALUES
  ('Registro de temperaturas de cámaras',1,true),
  ('Verificación de mise en place',2,true),
  ('Control de caducidades',3,false),
  ('Limpieza y desinfección de superficies',4,false)
) AS d(descripcion,orden,completado)
UNION ALL
SELECT id, d.descripcion, d.orden, d.completado, CASE WHEN d.completado THEN now() ELSE NULL END
FROM c2, (VALUES
  ('Cuadre de caja del turno',1,true),
  ('Cierre de bar y control de inventario',2,false),
  ('Montaje de sala para desayuno',3,false)
) AS d(descripcion,orden,completado);

INSERT INTO public.internal_requests (titulo, detalle, area_solicitante, area_destino, prioridad, estado) VALUES
  ('Reposición de vajilla','20 platos base y 15 copas de agua para servicio de cena.',(SELECT id FROM public.areas WHERE codigo='RES'),(SELECT id FROM public.areas WHERE codigo='ADM'),'media','solicitado'),
  ('Revisión de campana extractora','Ruido anormal en campana de cocina caliente.',(SELECT id FROM public.areas WHERE codigo='COC'),(SELECT id FROM public.areas WHERE codigo='MTO'),'alta','en_proceso'),
  ('Blancos adicionales para evento','30 manteles y 60 servilletas para montaje del viernes.',(SELECT id FROM public.areas WHERE codigo='EVE'),(SELECT id FROM public.areas WHERE codigo='HSK'),'media','entregado');

INSERT INTO public.vip_alerts (huesped, habitacion, preferencias, alergias, restricciones, areas_involucradas, llegada, salida, prioridad) VALUES
  ('Huésped VIP 001 (ficticio)','1204','Check-in privado, almohada firme, agua sin gas.','Frutos secos','Sin contacto con prensa','{COC,REC,HSK}', CURRENT_DATE, CURRENT_DATE + 2,'alta'),
  ('Huésped VIP 002 (ficticio)','0908','Menú vegetariano, cena en suite a las 21:00.','Lactosa','Confidencialidad total de itinerario','{COC,RES}', CURRENT_DATE, CURRENT_DATE + 1,'critica'),
  ('Delegación corporativa (ficticia)','Salón Pichincha','Coffee break sin azúcar añadida, sala reservada.','Gluten','Acceso restringido al salón','{EVE,RES}', CURRENT_DATE + 3, CURRENT_DATE + 4,'alta');