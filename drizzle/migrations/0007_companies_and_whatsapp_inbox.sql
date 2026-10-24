CREATE TYPE public.company_role AS ENUM ('owner', 'agent');

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Minha empresa',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_members (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.company_role NOT NULL DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, user_id)
);
CREATE INDEX company_members_user_idx ON public.company_members(user_id);
GRANT SELECT ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_company_member(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.has_company_role(_company uuid, _role public.company_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.company_members WHERE company_id = _company AND user_id = auth.uid() AND role = _role);
$$;

CREATE POLICY "members read company" ON public.companies FOR SELECT TO authenticated USING (public.is_company_member(id));
CREATE POLICY "owners update company" ON public.companies FOR UPDATE TO authenticated USING (public.has_company_role(id, 'owner')) WITH CHECK (public.has_company_role(id, 'owner'));
CREATE POLICY "members read members" ON public.company_members FOR SELECT TO authenticated USING (public.is_company_member(company_id));

-- Creates the user's own company on first use; members can never self-join another company.
CREATE OR REPLACE FUNCTION public.ensure_company_for(_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE cid uuid; cname text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('company:' || _user::text, 0));
  SELECT company_id INTO cid FROM public.company_members WHERE user_id = _user ORDER BY (role = 'owner') DESC, created_at LIMIT 1;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  SELECT NULLIF(trim(company_name), '') INTO cname FROM public.profiles WHERE id = _user;
  INSERT INTO public.companies(name, created_by) VALUES (COALESCE(cname, 'Minha empresa'), _user) RETURNING id INTO cid;
  INSERT INTO public.company_members(company_id, user_id, role) VALUES (cid, _user, 'owner');
  RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.ensure_company_for(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  RETURN public.ensure_company_for(auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.my_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_company_id() TO authenticated;

-- Backfill: every existing account becomes owner of its own company.
SELECT public.ensure_company_for(p.id) FROM public.profiles p;

ALTER TABLE public.opportunities ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.tasks ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.diagnostics ADD COLUMN company_id uuid REFERENCES public.companies(id);
UPDATE public.opportunities o SET company_id = public.ensure_company_for(o.user_id) WHERE company_id IS NULL;
UPDATE public.tasks t SET company_id = public.ensure_company_for(t.user_id) WHERE company_id IS NULL;
UPDATE public.diagnostics d SET company_id = public.ensure_company_for(d.user_id) WHERE company_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.company_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.company_members WHERE company_id = NEW.company_id AND user_id = NEW.user_id) THEN
    NEW.company_id := public.ensure_company_for(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER set_company_id BEFORE INSERT ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_company_id();
CREATE TRIGGER set_company_id BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_company_id();
CREATE TRIGGER set_company_id BEFORE INSERT ON public.diagnostics FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name') on conflict do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict do nothing;
  perform public.ensure_company_for(new.id);
  return new;
end $$;

-- WhatsApp attendant (simulated until official Meta connection exists).
CREATE TABLE public.wa_channels (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'simulado' CHECK (status IN ('simulado','pendente','ativo')),
  phone_number_id text UNIQUE,
  waba_id text,
  display_phone text,
  ai_enabled boolean NOT NULL DEFAULT true,
  prompt text NOT NULL DEFAULT '',
  business_hours text NOT NULL DEFAULT '',
  handoff_message text NOT NULL DEFAULT 'Vou chamar uma pessoa da equipe para continuar seu atendimento.',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.wa_channels TO authenticated;
GRANT ALL ON public.wa_channels TO service_role;
ALTER TABLE public.wa_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read channel" ON public.wa_channels FOR SELECT TO authenticated USING (public.is_company_member(company_id));
-- Owners edit attendant settings; status and Meta identifiers are only set by the server.
CREATE POLICY "owners create channel" ON public.wa_channels FOR INSERT TO authenticated WITH CHECK (public.has_company_role(company_id,'owner') AND status = 'simulado' AND phone_number_id IS NULL AND waba_id IS NULL);
CREATE POLICY "owners update channel" ON public.wa_channels FOR UPDATE TO authenticated USING (public.has_company_role(company_id,'owner')) WITH CHECK (public.has_company_role(company_id,'owner'));
REVOKE UPDATE (status, phone_number_id, waba_id, display_phone) ON public.wa_channels FROM authenticated;

CREATE TABLE public.wa_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wa_id text NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, wa_id)
);
CREATE TABLE public.wa_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.wa_contacts(id) ON DELETE CASCADE,
  ai_paused boolean NOT NULL DEFAULT false,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, contact_id)
);
CREATE TABLE public.wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  sender text NOT NULL CHECK (sender IN ('contact','ai','human','system')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, external_id)
);
CREATE INDEX wa_messages_conv_idx ON public.wa_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.wa_contacts, public.wa_conversations TO authenticated;
GRANT SELECT, INSERT ON public.wa_messages TO authenticated;
GRANT ALL ON public.wa_contacts, public.wa_conversations, public.wa_messages TO service_role;
ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members contacts" ON public.wa_contacts FOR ALL TO authenticated USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "members conversations" ON public.wa_conversations FOR ALL TO authenticated USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id));
CREATE POLICY "members read messages" ON public.wa_messages FOR SELECT TO authenticated USING (public.is_company_member(company_id));
CREATE POLICY "members add messages" ON public.wa_messages FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id));