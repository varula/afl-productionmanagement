-- Fix: approve the admin user dhnperumal@gmail.com
UPDATE public.profiles SET is_approved = true WHERE user_id = '6a9b879c-f91d-4b0f-a64d-241ca32b6996';

-- Create missing triggers (skip auth ones that already exist)
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

DROP TRIGGER IF EXISTS on_profile_check_admin ON public.profiles;
CREATE TRIGGER on_profile_check_admin
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_admin_email_on_profile();
