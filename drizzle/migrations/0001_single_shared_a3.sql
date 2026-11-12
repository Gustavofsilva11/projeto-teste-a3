DROP TRIGGER t_loan_sync ON public.loans;
DROP FUNCTION public.loan_sync_cert();
ALTER TABLE public.loans ALTER COLUMN certificate_id SET DEFAULT 'f780e8aa-0000-4000-8000-000000000001'::uuid;
ALTER TABLE public.loans DROP CONSTRAINT loans_certificate_id_fkey;
COMMENT ON COLUMN public.loans.certificate_id IS 'DEPRECATED: unused legacy inventory identifier; loans now represent the single shared A3.';
COMMENT ON TABLE public.certificates IS 'DEPRECATED: retired inventory; the application manages the shared A3 directly through loans.';
REVOKE ALL ON public.certificates FROM anon, authenticated;
DROP POLICY "auth all certificates" ON public.certificates;
CREATE OR REPLACE FUNCTION public.loan_before()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.expected_return_date <= NEW.checkout_date THEN
    RAISE EXCEPTION 'A previsão de devolução deve ser depois da retirada.';
  END IF;
  IF NEW.actual_return_date IS NOT NULL AND NEW.actual_return_date < NEW.checkout_date THEN
    RAISE EXCEPTION 'A devolução não pode ser anterior à retirada.';
  END IF;
  IF NEW.actual_return_date IS NULL THEN NEW.status := 'em_uso'; ELSE NEW.status := 'devolvido'; END IF;
  RETURN NEW;
END;
$$;
CREATE UNIQUE INDEX loans_one_open_a3 ON public.loans ((true)) WHERE actual_return_date IS NULL;
COMMENT ON INDEX public.loans_one_open_a3 IS 'Only one open loan is allowed for the shared A3, including concurrent inserts and updates.';