
-- Create a function that auto-assigns admin role to specific authorized emails
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
BEGIN
  _email := NEW.email;
  
  -- Check if the email is one of the super admin emails
  IF _email IN ('ie@armanagroup.com', 'dhnperumal@gmail.com') THEN
    -- Remove any existing roles
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Auto-approve the profile
    UPDATE public.profiles SET is_approved = true WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users - fires after the handle_new_user trigger
-- We use a trigger on profiles instead since we can't attach to auth schema
-- Instead, let's create a trigger on profiles table
CREATE OR REPLACE FUNCTION public.check_admin_email_on_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
BEGIN
  -- Get the email from auth.users
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  
  IF _email IN ('ie@armanagroup.com', 'dhnperumal@gmail.com') THEN
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Remove default operator role if exists
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'operator'::app_role;
    
    -- Auto-approve
    NEW.is_approved := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_profile_check_admin ON public.profiles;

-- Create trigger on profiles table (fires after profile is created)
CREATE TRIGGER on_profile_check_admin
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_admin_email_on_profile();
