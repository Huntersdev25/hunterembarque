-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'candidate');
CREATE TYPE public.gender AS ENUM ('masculino', 'feminino', 'outro');
CREATE TYPE public.application_status AS ENUM ('lista_espera', 'contato_realizado', 'finalizado');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'candidate',
    
    -- Personal information
    rg TEXT,
    cpf TEXT,
    gender gender,
    desired_function TEXT,
    professional_experience TEXT,
    residence_location TEXT,
    birth_date DATE,
    
    -- Availability
    available_from DATE,
    available_until DATE,
    
    -- Salary expectation
    salary_expectation DECIMAL(10,2),
    
    -- Vessel type
    vessel_type TEXT,
    
    -- Profile completion status
    profile_complete BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    function_name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create applications table
CREATE TABLE public.applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status application_status DEFAULT 'lista_espera',
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(job_id, candidate_id)
);

-- Create certifications table
CREATE TABLE public.certifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- All certifications with boolean and validity date
    cir BOOLEAN DEFAULT FALSE,
    cir_validity DATE,
    stcw BOOLEAN DEFAULT FALSE,
    stcw_validity DATE,
    tbs1 BOOLEAN DEFAULT FALSE,
    tbs1_validity DATE,
    cbsp BOOLEAN DEFAULT FALSE,
    cbsp_validity DATE,
    thuet BOOLEAN DEFAULT FALSE,
    thuet_validity DATE,
    espe BOOLEAN DEFAULT FALSE,
    espe_validity DATE,
    esrs BOOLEAN DEFAULT FALSE,
    esrs_validity DATE,
    ebps BOOLEAN DEFAULT FALSE,
    ebps_validity DATE,
    ecin BOOLEAN DEFAULT FALSE,
    ecin_validity DATE,
    ecia_caci BOOLEAN DEFAULT FALSE,
    ecia_caci_validity DATE,
    ebcp BOOLEAN DEFAULT FALSE,
    ebcp_validity DATE,
    eopn BOOLEAN DEFAULT FALSE,
    eopn_validity DATE,
    epsm BOOLEAN DEFAULT FALSE,
    epsm_validity DATE,
    cess BOOLEAN DEFAULT FALSE,
    cess_validity DATE,
    cerr BOOLEAN DEFAULT FALSE,
    cerr_validity DATE,
    efnt BOOLEAN DEFAULT FALSE,
    efnt_validity DATE,
    ebpq BOOLEAN DEFAULT FALSE,
    ebpq_validity DATE,
    ebgl BOOLEAN DEFAULT FALSE,
    ebgl_validity DATE,
    esop BOOLEAN DEFAULT FALSE,
    esop_validity DATE,
    alph BOOLEAN DEFAULT FALSE,
    alph_validity DATE,
    cns014 BOOLEAN DEFAULT FALSE,
    cns014_validity DATE,
    lpn BOOLEAN DEFAULT FALSE,
    lpn_validity DATE,
    gmdss BOOLEAN DEFAULT FALSE,
    gmdss_validity DATE,
    cft BOOLEAN DEFAULT FALSE,
    cft_validity DATE,
    caaq BOOLEAN DEFAULT FALSE,
    caaq_validity DATE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.profiles WHERE user_id = user_uuid;
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = user_uuid AND role = 'admin'
    );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    USING (public.is_admin(auth.uid()));

-- RLS Policies for jobs
CREATE POLICY "Anyone can view active jobs"
    ON public.jobs FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage jobs"
    ON public.jobs FOR ALL
    USING (public.is_admin(auth.uid()));

-- RLS Policies for applications
CREATE POLICY "Users can view their own applications"
    ON public.applications FOR SELECT
    USING (auth.uid() = candidate_id);

CREATE POLICY "Users can create applications"
    ON public.applications FOR INSERT
    WITH CHECK (auth.uid() = candidate_id);

CREATE POLICY "Admins can view all applications"
    ON public.applications FOR SELECT
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update applications"
    ON public.applications FOR UPDATE
    USING (public.is_admin(auth.uid()));

-- RLS Policies for certifications
CREATE POLICY "Users can view their own certifications"
    ON public.certifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own certifications"
    ON public.certifications FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all certifications"
    ON public.certifications FOR SELECT
    USING (public.is_admin(auth.uid()));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, phone, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'candidate')
    );
    
    -- Create certifications record for the user
    INSERT INTO public.certifications (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certifications_updated_at
    BEFORE UPDATE ON public.certifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();