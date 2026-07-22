export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      administrators: {
        Row: {
          cargo: string
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo?: string
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo?: string
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_covers: {
        Row: {
          agent_id: string
          cover_url: string
          created_at: string
          id: string
          updated_at: string
          updated_by: string | null
          webhook_url: string | null
        }
        Insert: {
          agent_id: string
          cover_url: string
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          webhook_url?: string | null
        }
        Update: {
          agent_id?: string
          cover_url?: string
          created_at?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string
          candidate_id: string
          contact_date: string | null
          contact_made: boolean | null
          contact_notes: string | null
          id: string
          interview_stage: string | null
          job_id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["application_status"] | null
        }
        Insert: {
          applied_at?: string
          candidate_id: string
          contact_date?: string | null
          contact_made?: boolean | null
          contact_notes?: string | null
          id?: string
          interview_stage?: string | null
          job_id: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
        }
        Update: {
          applied_at?: string
          candidate_id?: string
          contact_date?: string | null
          contact_made?: boolean | null
          contact_notes?: string | null
          id?: string
          interview_stage?: string | null
          job_id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_email: string
          user_id: string | null
          user_name: string | null
          user_role: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_email: string
          user_id?: string | null
          user_name?: string | null
          user_role: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string | null
          user_role?: string
        }
        Relationships: []
      }
      boarding_companies: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      boarding_employees: {
        Row: {
          candidate_id: string | null
          client_candidate_id: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          name: string
          role: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          client_candidate_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          name: string
          role: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          client_candidate_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          name?: string
          role?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_employees_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "boarding_employees_client_candidate_id_fkey"
            columns: ["client_candidate_id"]
            isOneToOne: false
            referencedRelation: "client_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_employees_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "boarding_units"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_units: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_units_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "boarding_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_onboarding_timeline: {
        Row: {
          application_id: string | null
          candidate_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          job_id: string
          metadata: Json | null
          source: string
          title: string
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          job_id: string
          metadata?: Json | null
          source?: string
          title: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          job_id?: string
          metadata?: Json | null
          source?: string
          title?: string
        }
        Relationships: []
      }
      certificate_alerts: {
        Row: {
          alert_type: string
          certification_key: string
          certification_name: string
          created_at: string
          id: string
          is_read: boolean | null
          notified_at: string | null
          profile_id: string
          validity_date: string
        }
        Insert: {
          alert_type: string
          certification_key: string
          certification_name: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          notified_at?: string | null
          profile_id: string
          validity_date: string
        }
        Update: {
          alert_type?: string
          certification_key?: string
          certification_name?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          notified_at?: string | null
          profile_id?: string
          validity_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_alerts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          alph: boolean | null
          alph_file_name: string | null
          alph_file_path: string | null
          alph_indeterminate: boolean | null
          alph_issue_date: string | null
          alph_validity: string | null
          caaq: boolean | null
          caaq_file_name: string | null
          caaq_file_path: string | null
          caaq_indeterminate: boolean | null
          caaq_issue_date: string | null
          caaq_validity: string | null
          cbsp: boolean | null
          cbsp_file_name: string | null
          cbsp_file_path: string | null
          cbsp_indeterminate: boolean | null
          cbsp_issue_date: string | null
          cbsp_validity: string | null
          cerr: boolean | null
          cerr_file_name: string | null
          cerr_file_path: string | null
          cerr_indeterminate: boolean | null
          cerr_issue_date: string | null
          cerr_validity: string | null
          cess: boolean | null
          cess_file_name: string | null
          cess_file_path: string | null
          cess_indeterminate: boolean | null
          cess_issue_date: string | null
          cess_validity: string | null
          cft: boolean | null
          cft_file_name: string | null
          cft_file_path: string | null
          cft_indeterminate: boolean | null
          cft_issue_date: string | null
          cft_validity: string | null
          cir: boolean | null
          cir_file_name: string | null
          cir_file_path: string | null
          cir_indeterminate: boolean | null
          cir_issue_date: string | null
          cir_validity: string | null
          cns014: boolean | null
          cns014_file_name: string | null
          cns014_file_path: string | null
          cns014_indeterminate: boolean | null
          cns014_issue_date: string | null
          cns014_validity: string | null
          created_at: string
          dp: boolean | null
          dp_dp_avancado: boolean | null
          dp_dp_basico: boolean | null
          dp_dp_ilimitado: boolean | null
          dp_file_name: string | null
          dp_file_path: string | null
          dp_indeterminate: boolean | null
          dp_issue_date: string | null
          dp_validity: string | null
          ebcp: boolean | null
          ebcp_file_name: string | null
          ebcp_file_path: string | null
          ebcp_indeterminate: boolean | null
          ebcp_issue_date: string | null
          ebcp_validity: string | null
          ebgl: boolean | null
          ebgl_file_name: string | null
          ebgl_file_path: string | null
          ebgl_indeterminate: boolean | null
          ebgl_issue_date: string | null
          ebgl_validity: string | null
          ebpq: boolean | null
          ebpq_file_name: string | null
          ebpq_file_path: string | null
          ebpq_indeterminate: boolean | null
          ebpq_issue_date: string | null
          ebpq_validity: string | null
          ebps: boolean | null
          ebps_file_name: string | null
          ebps_file_path: string | null
          ebps_indeterminate: boolean | null
          ebps_issue_date: string | null
          ebps_validity: string | null
          ecia_caci: boolean | null
          ecia_caci_file_name: string | null
          ecia_caci_file_path: string | null
          ecia_caci_indeterminate: boolean | null
          ecia_caci_issue_date: string | null
          ecia_caci_validity: string | null
          ecin: boolean | null
          ecin_file_name: string | null
          ecin_file_path: string | null
          ecin_indeterminate: boolean | null
          ecin_issue_date: string | null
          ecin_validity: string | null
          efnt: boolean | null
          efnt_file_name: string | null
          efnt_file_path: string | null
          efnt_indeterminate: boolean | null
          efnt_issue_date: string | null
          efnt_validity: string | null
          eopn: boolean | null
          eopn_file_name: string | null
          eopn_file_path: string | null
          eopn_indeterminate: boolean | null
          eopn_issue_date: string | null
          eopn_validity: string | null
          epsm: boolean | null
          epsm_file_name: string | null
          epsm_file_path: string | null
          epsm_indeterminate: boolean | null
          epsm_issue_date: string | null
          epsm_validity: string | null
          esop: boolean | null
          esop_file_name: string | null
          esop_file_path: string | null
          esop_indeterminate: boolean | null
          esop_issue_date: string | null
          esop_validity: string | null
          espe: boolean | null
          espe_file_name: string | null
          espe_file_path: string | null
          espe_indeterminate: boolean | null
          espe_issue_date: string | null
          espe_validity: string | null
          esrs: boolean | null
          esrs_file_name: string | null
          esrs_file_path: string | null
          esrs_indeterminate: boolean | null
          esrs_issue_date: string | null
          esrs_validity: string | null
          gmdss: boolean | null
          gmdss_file_name: string | null
          gmdss_file_path: string | null
          gmdss_indeterminate: boolean | null
          gmdss_issue_date: string | null
          gmdss_validity: string | null
          id: string
          lpn: boolean | null
          lpn_file_name: string | null
          lpn_file_path: string | null
          lpn_indeterminate: boolean | null
          lpn_issue_date: string | null
          lpn_validity: string | null
          stcw: boolean | null
          stcw_file_name: string | null
          stcw_file_path: string | null
          stcw_indeterminate: boolean | null
          stcw_issue_date: string | null
          stcw_rules: string | null
          stcw_validity: string | null
          stcw_validity_date: string | null
          tbs1: boolean | null
          tbs1_file_name: string | null
          tbs1_file_path: string | null
          tbs1_indeterminate: boolean | null
          tbs1_issue_date: string | null
          tbs1_validity: string | null
          thuet: boolean | null
          thuet_file_name: string | null
          thuet_file_path: string | null
          thuet_indeterminate: boolean | null
          thuet_issue_date: string | null
          thuet_validity: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alph?: boolean | null
          alph_file_name?: string | null
          alph_file_path?: string | null
          alph_indeterminate?: boolean | null
          alph_issue_date?: string | null
          alph_validity?: string | null
          caaq?: boolean | null
          caaq_file_name?: string | null
          caaq_file_path?: string | null
          caaq_indeterminate?: boolean | null
          caaq_issue_date?: string | null
          caaq_validity?: string | null
          cbsp?: boolean | null
          cbsp_file_name?: string | null
          cbsp_file_path?: string | null
          cbsp_indeterminate?: boolean | null
          cbsp_issue_date?: string | null
          cbsp_validity?: string | null
          cerr?: boolean | null
          cerr_file_name?: string | null
          cerr_file_path?: string | null
          cerr_indeterminate?: boolean | null
          cerr_issue_date?: string | null
          cerr_validity?: string | null
          cess?: boolean | null
          cess_file_name?: string | null
          cess_file_path?: string | null
          cess_indeterminate?: boolean | null
          cess_issue_date?: string | null
          cess_validity?: string | null
          cft?: boolean | null
          cft_file_name?: string | null
          cft_file_path?: string | null
          cft_indeterminate?: boolean | null
          cft_issue_date?: string | null
          cft_validity?: string | null
          cir?: boolean | null
          cir_file_name?: string | null
          cir_file_path?: string | null
          cir_indeterminate?: boolean | null
          cir_issue_date?: string | null
          cir_validity?: string | null
          cns014?: boolean | null
          cns014_file_name?: string | null
          cns014_file_path?: string | null
          cns014_indeterminate?: boolean | null
          cns014_issue_date?: string | null
          cns014_validity?: string | null
          created_at?: string
          dp?: boolean | null
          dp_dp_avancado?: boolean | null
          dp_dp_basico?: boolean | null
          dp_dp_ilimitado?: boolean | null
          dp_file_name?: string | null
          dp_file_path?: string | null
          dp_indeterminate?: boolean | null
          dp_issue_date?: string | null
          dp_validity?: string | null
          ebcp?: boolean | null
          ebcp_file_name?: string | null
          ebcp_file_path?: string | null
          ebcp_indeterminate?: boolean | null
          ebcp_issue_date?: string | null
          ebcp_validity?: string | null
          ebgl?: boolean | null
          ebgl_file_name?: string | null
          ebgl_file_path?: string | null
          ebgl_indeterminate?: boolean | null
          ebgl_issue_date?: string | null
          ebgl_validity?: string | null
          ebpq?: boolean | null
          ebpq_file_name?: string | null
          ebpq_file_path?: string | null
          ebpq_indeterminate?: boolean | null
          ebpq_issue_date?: string | null
          ebpq_validity?: string | null
          ebps?: boolean | null
          ebps_file_name?: string | null
          ebps_file_path?: string | null
          ebps_indeterminate?: boolean | null
          ebps_issue_date?: string | null
          ebps_validity?: string | null
          ecia_caci?: boolean | null
          ecia_caci_file_name?: string | null
          ecia_caci_file_path?: string | null
          ecia_caci_indeterminate?: boolean | null
          ecia_caci_issue_date?: string | null
          ecia_caci_validity?: string | null
          ecin?: boolean | null
          ecin_file_name?: string | null
          ecin_file_path?: string | null
          ecin_indeterminate?: boolean | null
          ecin_issue_date?: string | null
          ecin_validity?: string | null
          efnt?: boolean | null
          efnt_file_name?: string | null
          efnt_file_path?: string | null
          efnt_indeterminate?: boolean | null
          efnt_issue_date?: string | null
          efnt_validity?: string | null
          eopn?: boolean | null
          eopn_file_name?: string | null
          eopn_file_path?: string | null
          eopn_indeterminate?: boolean | null
          eopn_issue_date?: string | null
          eopn_validity?: string | null
          epsm?: boolean | null
          epsm_file_name?: string | null
          epsm_file_path?: string | null
          epsm_indeterminate?: boolean | null
          epsm_issue_date?: string | null
          epsm_validity?: string | null
          esop?: boolean | null
          esop_file_name?: string | null
          esop_file_path?: string | null
          esop_indeterminate?: boolean | null
          esop_issue_date?: string | null
          esop_validity?: string | null
          espe?: boolean | null
          espe_file_name?: string | null
          espe_file_path?: string | null
          espe_indeterminate?: boolean | null
          espe_issue_date?: string | null
          espe_validity?: string | null
          esrs?: boolean | null
          esrs_file_name?: string | null
          esrs_file_path?: string | null
          esrs_indeterminate?: boolean | null
          esrs_issue_date?: string | null
          esrs_validity?: string | null
          gmdss?: boolean | null
          gmdss_file_name?: string | null
          gmdss_file_path?: string | null
          gmdss_indeterminate?: boolean | null
          gmdss_issue_date?: string | null
          gmdss_validity?: string | null
          id?: string
          lpn?: boolean | null
          lpn_file_name?: string | null
          lpn_file_path?: string | null
          lpn_indeterminate?: boolean | null
          lpn_issue_date?: string | null
          lpn_validity?: string | null
          stcw?: boolean | null
          stcw_file_name?: string | null
          stcw_file_path?: string | null
          stcw_indeterminate?: boolean | null
          stcw_issue_date?: string | null
          stcw_rules?: string | null
          stcw_validity?: string | null
          stcw_validity_date?: string | null
          tbs1?: boolean | null
          tbs1_file_name?: string | null
          tbs1_file_path?: string | null
          tbs1_indeterminate?: boolean | null
          tbs1_issue_date?: string | null
          tbs1_validity?: string | null
          thuet?: boolean | null
          thuet_file_name?: string | null
          thuet_file_path?: string | null
          thuet_indeterminate?: boolean | null
          thuet_issue_date?: string | null
          thuet_validity?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alph?: boolean | null
          alph_file_name?: string | null
          alph_file_path?: string | null
          alph_indeterminate?: boolean | null
          alph_issue_date?: string | null
          alph_validity?: string | null
          caaq?: boolean | null
          caaq_file_name?: string | null
          caaq_file_path?: string | null
          caaq_indeterminate?: boolean | null
          caaq_issue_date?: string | null
          caaq_validity?: string | null
          cbsp?: boolean | null
          cbsp_file_name?: string | null
          cbsp_file_path?: string | null
          cbsp_indeterminate?: boolean | null
          cbsp_issue_date?: string | null
          cbsp_validity?: string | null
          cerr?: boolean | null
          cerr_file_name?: string | null
          cerr_file_path?: string | null
          cerr_indeterminate?: boolean | null
          cerr_issue_date?: string | null
          cerr_validity?: string | null
          cess?: boolean | null
          cess_file_name?: string | null
          cess_file_path?: string | null
          cess_indeterminate?: boolean | null
          cess_issue_date?: string | null
          cess_validity?: string | null
          cft?: boolean | null
          cft_file_name?: string | null
          cft_file_path?: string | null
          cft_indeterminate?: boolean | null
          cft_issue_date?: string | null
          cft_validity?: string | null
          cir?: boolean | null
          cir_file_name?: string | null
          cir_file_path?: string | null
          cir_indeterminate?: boolean | null
          cir_issue_date?: string | null
          cir_validity?: string | null
          cns014?: boolean | null
          cns014_file_name?: string | null
          cns014_file_path?: string | null
          cns014_indeterminate?: boolean | null
          cns014_issue_date?: string | null
          cns014_validity?: string | null
          created_at?: string
          dp?: boolean | null
          dp_dp_avancado?: boolean | null
          dp_dp_basico?: boolean | null
          dp_dp_ilimitado?: boolean | null
          dp_file_name?: string | null
          dp_file_path?: string | null
          dp_indeterminate?: boolean | null
          dp_issue_date?: string | null
          dp_validity?: string | null
          ebcp?: boolean | null
          ebcp_file_name?: string | null
          ebcp_file_path?: string | null
          ebcp_indeterminate?: boolean | null
          ebcp_issue_date?: string | null
          ebcp_validity?: string | null
          ebgl?: boolean | null
          ebgl_file_name?: string | null
          ebgl_file_path?: string | null
          ebgl_indeterminate?: boolean | null
          ebgl_issue_date?: string | null
          ebgl_validity?: string | null
          ebpq?: boolean | null
          ebpq_file_name?: string | null
          ebpq_file_path?: string | null
          ebpq_indeterminate?: boolean | null
          ebpq_issue_date?: string | null
          ebpq_validity?: string | null
          ebps?: boolean | null
          ebps_file_name?: string | null
          ebps_file_path?: string | null
          ebps_indeterminate?: boolean | null
          ebps_issue_date?: string | null
          ebps_validity?: string | null
          ecia_caci?: boolean | null
          ecia_caci_file_name?: string | null
          ecia_caci_file_path?: string | null
          ecia_caci_indeterminate?: boolean | null
          ecia_caci_issue_date?: string | null
          ecia_caci_validity?: string | null
          ecin?: boolean | null
          ecin_file_name?: string | null
          ecin_file_path?: string | null
          ecin_indeterminate?: boolean | null
          ecin_issue_date?: string | null
          ecin_validity?: string | null
          efnt?: boolean | null
          efnt_file_name?: string | null
          efnt_file_path?: string | null
          efnt_indeterminate?: boolean | null
          efnt_issue_date?: string | null
          efnt_validity?: string | null
          eopn?: boolean | null
          eopn_file_name?: string | null
          eopn_file_path?: string | null
          eopn_indeterminate?: boolean | null
          eopn_issue_date?: string | null
          eopn_validity?: string | null
          epsm?: boolean | null
          epsm_file_name?: string | null
          epsm_file_path?: string | null
          epsm_indeterminate?: boolean | null
          epsm_issue_date?: string | null
          epsm_validity?: string | null
          esop?: boolean | null
          esop_file_name?: string | null
          esop_file_path?: string | null
          esop_indeterminate?: boolean | null
          esop_issue_date?: string | null
          esop_validity?: string | null
          espe?: boolean | null
          espe_file_name?: string | null
          espe_file_path?: string | null
          espe_indeterminate?: boolean | null
          espe_issue_date?: string | null
          espe_validity?: string | null
          esrs?: boolean | null
          esrs_file_name?: string | null
          esrs_file_path?: string | null
          esrs_indeterminate?: boolean | null
          esrs_issue_date?: string | null
          esrs_validity?: string | null
          gmdss?: boolean | null
          gmdss_file_name?: string | null
          gmdss_file_path?: string | null
          gmdss_indeterminate?: boolean | null
          gmdss_issue_date?: string | null
          gmdss_validity?: string | null
          id?: string
          lpn?: boolean | null
          lpn_file_name?: string | null
          lpn_file_path?: string | null
          lpn_indeterminate?: boolean | null
          lpn_issue_date?: string | null
          lpn_validity?: string | null
          stcw?: boolean | null
          stcw_file_name?: string | null
          stcw_file_path?: string | null
          stcw_indeterminate?: boolean | null
          stcw_issue_date?: string | null
          stcw_rules?: string | null
          stcw_validity?: string | null
          stcw_validity_date?: string | null
          tbs1?: boolean | null
          tbs1_file_name?: string | null
          tbs1_file_path?: string | null
          tbs1_indeterminate?: boolean | null
          tbs1_issue_date?: string | null
          tbs1_validity?: string | null
          thuet?: boolean | null
          thuet_file_name?: string | null
          thuet_file_path?: string | null
          thuet_indeterminate?: boolean | null
          thuet_issue_date?: string | null
          thuet_validity?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          "banco de indicacoes": boolean | null
          created_at: string
          email: string | null
          entrevistando: boolean | null
          id: number
          nome: string | null
          qualificado: boolean | null
          remotejid: string | null
          residencia: string | null
          status: string | null
          "vaga desejada": string | null
        }
        Insert: {
          "banco de indicacoes"?: boolean | null
          created_at?: string
          email?: string | null
          entrevistando?: boolean | null
          id?: number
          nome?: string | null
          qualificado?: boolean | null
          remotejid?: string | null
          residencia?: string | null
          status?: string | null
          "vaga desejada"?: string | null
        }
        Update: {
          "banco de indicacoes"?: boolean | null
          created_at?: string
          email?: string | null
          entrevistando?: boolean | null
          id?: number
          nome?: string | null
          qualificado?: boolean | null
          remotejid?: string | null
          residencia?: string | null
          status?: string | null
          "vaga desejada"?: string | null
        }
        Relationships: []
      }
      client_candidate_documents: {
        Row: {
          client_candidate_id: string
          created_at: string
          document_type: string | null
          file_name: string
          file_path: string
          id: string
          notes: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          client_candidate_id: string
          created_at?: string
          document_type?: string | null
          file_name: string
          file_path: string
          id?: string
          notes?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          client_candidate_id?: string
          created_at?: string
          document_type?: string | null
          file_name?: string
          file_path?: string
          id?: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_candidate_documents_client_candidate_id_fkey"
            columns: ["client_candidate_id"]
            isOneToOne: false
            referencedRelation: "client_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_candidate_visibility: {
        Row: {
          client_candidate_id: string
          created_at: string
          id: string
          show_address: boolean | null
          show_availability: boolean | null
          show_certifications: boolean | null
          show_contact_info: boolean | null
          show_documents: boolean | null
          show_personal_documents: boolean | null
          show_professional_experience: boolean | null
          show_salary_expectation: boolean | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          client_candidate_id: string
          created_at?: string
          id?: string
          show_address?: boolean | null
          show_availability?: boolean | null
          show_certifications?: boolean | null
          show_contact_info?: boolean | null
          show_documents?: boolean | null
          show_personal_documents?: boolean | null
          show_professional_experience?: boolean | null
          show_salary_expectation?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          client_candidate_id?: string
          created_at?: string
          id?: string
          show_address?: boolean | null
          show_availability?: boolean | null
          show_certifications?: boolean | null
          show_contact_info?: boolean | null
          show_documents?: boolean | null
          show_personal_documents?: boolean | null
          show_professional_experience?: boolean | null
          show_salary_expectation?: boolean | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_candidate_visibility_client_candidate_id_fkey"
            columns: ["client_candidate_id"]
            isOneToOne: true
            referencedRelation: "client_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_candidates: {
        Row: {
          aso_status: string | null
          assigned_at: string
          assigned_by: string
          boarding_employee_id: string | null
          candidate_id: string
          client_id: string
          company_user_id: string | null
          id: string
          interview_date: string | null
          interview_evaluated_at: string | null
          interview_status: string | null
          interview_time: string | null
          job_id: string | null
          notes: string | null
          period_end: string | null
          period_start: string | null
          rejection_reason: string | null
          vessel_name: string | null
        }
        Insert: {
          aso_status?: string | null
          assigned_at?: string
          assigned_by: string
          boarding_employee_id?: string | null
          candidate_id: string
          client_id: string
          company_user_id?: string | null
          id?: string
          interview_date?: string | null
          interview_evaluated_at?: string | null
          interview_status?: string | null
          interview_time?: string | null
          job_id?: string | null
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          rejection_reason?: string | null
          vessel_name?: string | null
        }
        Update: {
          aso_status?: string | null
          assigned_at?: string
          assigned_by?: string
          boarding_employee_id?: string | null
          candidate_id?: string
          client_id?: string
          company_user_id?: string | null
          id?: string
          interview_date?: string | null
          interview_evaluated_at?: string | null
          interview_status?: string | null
          interview_time?: string | null
          job_id?: string | null
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          rejection_reason?: string | null
          vessel_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_candidates_boarding_employee_id_fkey"
            columns: ["boarding_employee_id"]
            isOneToOne: false
            referencedRelation: "boarding_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_candidates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_candidates_company_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          client_type: string
          company_name: string
          contact_name: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_active: boolean | null
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_type?: string
          company_name: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_type?: string
          company_name?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_users: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string
          role: Database["public"]["Enums"]["company_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          phone: string
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string
          role?: Database["public"]["Enums"]["company_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity_logs: {
        Row: {
          action_description: string
          action_type: string
          created_at: string
          entity_id: string | null
          entity_title: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
          user_id: string
          user_name: string | null
          user_role: string
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
          user_name?: string | null
          user_role?: string
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
          user_name?: string | null
          user_role?: string
        }
        Relationships: []
      }
      job_functions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_match_scores: {
        Row: {
          ai_analysis: string | null
          ai_summary: string | null
          calculated_at: string
          certification_score: number
          experience_score: number
          id: string
          job_id: string
          overall_score: number
          profile_id: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_summary?: string | null
          calculated_at?: string
          certification_score: number
          experience_score: number
          id?: string
          job_id: string
          overall_score: number
          profile_id: string
        }
        Update: {
          ai_analysis?: string | null
          ai_summary?: string | null
          calculated_at?: string
          certification_score?: number
          experience_score?: number
          id?: string
          job_id?: string
          overall_score?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_match_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_match_scores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          client_id: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          description: string
          function_name: string
          id: string
          is_active: boolean | null
          required_certifications: Json | null
          required_certifications_list: Json | null
          requirements: string | null
          short_description: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          description: string
          function_name: string
          id?: string
          is_active?: boolean | null
          required_certifications?: Json | null
          required_certifications_list?: Json | null
          requirements?: string | null
          short_description?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          description?: string
          function_name?: string
          id?: string
          is_active?: boolean | null
          required_certifications?: Json | null
          required_certifications_list?: Json | null
          requirements?: string | null
          short_description?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_requirements: {
        Row: {
          aso_file_name: string | null
          aso_file_path: string | null
          aso_notes: string | null
          aso_status: string | null
          aso_validity: string | null
          client_candidate_id: string
          created_at: string
          created_by: string
          epi_delivery_date: string | null
          epi_file_name: string | null
          epi_file_path: string | null
          epi_items: string[] | null
          epi_notes: string | null
          epi_status: string | null
          fgts_file_name: string | null
          fgts_file_path: string | null
          fgts_last_payment: string | null
          fgts_notes: string | null
          fgts_status: string | null
          id: string
          inss_file_name: string | null
          inss_file_path: string | null
          inss_last_payment: string | null
          inss_notes: string | null
          inss_status: string | null
          salary_amount: number | null
          salary_file_name: string | null
          salary_file_path: string | null
          salary_last_payment: string | null
          salary_notes: string | null
          salary_status: string | null
          updated_at: string
        }
        Insert: {
          aso_file_name?: string | null
          aso_file_path?: string | null
          aso_notes?: string | null
          aso_status?: string | null
          aso_validity?: string | null
          client_candidate_id: string
          created_at?: string
          created_by: string
          epi_delivery_date?: string | null
          epi_file_name?: string | null
          epi_file_path?: string | null
          epi_items?: string[] | null
          epi_notes?: string | null
          epi_status?: string | null
          fgts_file_name?: string | null
          fgts_file_path?: string | null
          fgts_last_payment?: string | null
          fgts_notes?: string | null
          fgts_status?: string | null
          id?: string
          inss_file_name?: string | null
          inss_file_path?: string | null
          inss_last_payment?: string | null
          inss_notes?: string | null
          inss_status?: string | null
          salary_amount?: number | null
          salary_file_name?: string | null
          salary_file_path?: string | null
          salary_last_payment?: string | null
          salary_notes?: string | null
          salary_status?: string | null
          updated_at?: string
        }
        Update: {
          aso_file_name?: string | null
          aso_file_path?: string | null
          aso_notes?: string | null
          aso_status?: string | null
          aso_validity?: string | null
          client_candidate_id?: string
          created_at?: string
          created_by?: string
          epi_delivery_date?: string | null
          epi_file_name?: string | null
          epi_file_path?: string | null
          epi_items?: string[] | null
          epi_notes?: string | null
          epi_status?: string | null
          fgts_file_name?: string | null
          fgts_file_path?: string | null
          fgts_last_payment?: string | null
          fgts_notes?: string | null
          fgts_status?: string | null
          id?: string
          inss_file_name?: string | null
          inss_file_path?: string | null
          inss_last_payment?: string | null
          inss_notes?: string | null
          inss_status?: string | null
          salary_amount?: number | null
          salary_file_name?: string | null
          salary_file_path?: string | null
          salary_last_payment?: string | null
          salary_notes?: string | null
          salary_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_requirements_client_candidate_id_fkey"
            columns: ["client_candidate_id"]
            isOneToOne: false
            referencedRelation: "client_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_costs: {
        Row: {
          boarding_allowance: number | null
          cir: string | null
          collaborator_name: string
          created_at: string
          created_by: string
          crew_transport: number | null
          disembarking_allowance: number | null
          hotel_accommodation: number | null
          hotel_extras: number | null
          id: string
          job_function: string | null
          monthly_plan: number | null
          notes: string | null
          number_of_days: number | null
          period_end: string | null
          period_start: string | null
          spot_plan: number | null
          standby_plan: number | null
          tickets: number | null
          uber_taxi_fuel: number | null
          updated_at: string
          vessel_id: string
        }
        Insert: {
          boarding_allowance?: number | null
          cir?: string | null
          collaborator_name: string
          created_at?: string
          created_by: string
          crew_transport?: number | null
          disembarking_allowance?: number | null
          hotel_accommodation?: number | null
          hotel_extras?: number | null
          id?: string
          job_function?: string | null
          monthly_plan?: number | null
          notes?: string | null
          number_of_days?: number | null
          period_end?: string | null
          period_start?: string | null
          spot_plan?: number | null
          standby_plan?: number | null
          tickets?: number | null
          uber_taxi_fuel?: number | null
          updated_at?: string
          vessel_id: string
        }
        Update: {
          boarding_allowance?: number | null
          cir?: string | null
          collaborator_name?: string
          created_at?: string
          created_by?: string
          crew_transport?: number | null
          disembarking_allowance?: number | null
          hotel_accommodation?: number | null
          hotel_extras?: number | null
          id?: string
          job_function?: string | null
          monthly_plan?: number | null
          notes?: string | null
          number_of_days?: number | null
          period_end?: string | null
          period_start?: string | null
          spot_plan?: number | null
          standby_plan?: number | null
          tickets?: number | null
          uber_taxi_fuel?: number | null
          updated_at?: string
          vessel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_costs_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "measurement_vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_vessels: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_vessels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          email_sent: boolean | null
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_sent?: boolean | null
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      professional_boarding_history: {
        Row: {
          boarding_employee_id: string | null
          company_name: string
          created_at: string
          disembarked_at: string | null
          embarked_at: string
          id: string
          is_internal: boolean | null
          notes: string | null
          position: string
          profile_id: string
          updated_at: string
          vessel_name: string | null
          vessel_type: string | null
        }
        Insert: {
          boarding_employee_id?: string | null
          company_name: string
          created_at?: string
          disembarked_at?: string | null
          embarked_at: string
          id?: string
          is_internal?: boolean | null
          notes?: string | null
          position: string
          profile_id: string
          updated_at?: string
          vessel_name?: string | null
          vessel_type?: string | null
        }
        Update: {
          boarding_employee_id?: string | null
          company_name?: string
          created_at?: string
          disembarked_at?: string | null
          embarked_at?: string
          id?: string
          is_internal?: boolean | null
          notes?: string | null
          position?: string
          profile_id?: string
          updated_at?: string
          vessel_name?: string | null
          vessel_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_boarding_history_boarding_employee_id_fkey"
            columns: ["boarding_employee_id"]
            isOneToOne: false
            referencedRelation: "boarding_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_boarding_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_costs: {
        Row: {
          accommodation_cost: number | null
          client_candidate_id: string
          created_at: string
          created_by: string
          daily_rate: number | null
          food_cost: number | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          other_costs: number | null
          other_costs_description: string | null
          payment_status: string | null
          total_cost: number | null
          total_days: number | null
          transportation_cost: number | null
          updated_at: string
        }
        Insert: {
          accommodation_cost?: number | null
          client_candidate_id: string
          created_at?: string
          created_by: string
          daily_rate?: number | null
          food_cost?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          other_costs?: number | null
          other_costs_description?: string | null
          payment_status?: string | null
          total_cost?: number | null
          total_days?: number | null
          transportation_cost?: number | null
          updated_at?: string
        }
        Update: {
          accommodation_cost?: number | null
          client_candidate_id?: string
          created_at?: string
          created_by?: string
          daily_rate?: number | null
          food_cost?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          other_costs?: number | null
          other_costs_description?: string | null
          payment_status?: string | null
          total_cost?: number | null
          total_days?: number | null
          transportation_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_costs_client_candidate_id_fkey"
            columns: ["client_candidate_id"]
            isOneToOne: false
            referencedRelation: "client_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_requests: {
        Row: {
          client_id: string
          company_user_id: string | null
          created_by: string
          description: string | null
          id: string
          job_function: string
          notes: string | null
          period_end: string | null
          period_start: string | null
          quantity: number
          requested_at: string
          required_certifications: Json | null
          status: string | null
          unit: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          client_id: string
          company_user_id?: string | null
          created_by: string
          description?: string | null
          id?: string
          job_function: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          quantity?: number
          requested_at?: string
          required_certifications?: Json | null
          status?: string | null
          unit?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          client_id?: string
          company_user_id?: string | null
          created_by?: string
          description?: string | null
          id?: string
          job_function?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          quantity?: number
          requested_at?: string
          required_certifications?: Json | null
          status?: string | null
          unit?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_requests_company_user_id_fkey"
            columns: ["company_user_id"]
            isOneToOne: false
            referencedRelation: "company_users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_complement: string | null
          address_number: string | null
          available_from: string | null
          available_until: string | null
          avatar_url: string | null
          birth_date: string | null
          cep: string | null
          city: string | null
          cpf: string | null
          created_at: string
          cv_file_name: string | null
          cv_file_path: string | null
          desired_function: string | null
          email: string
          followup1: boolean | null
          followup2: boolean | null
          followup3: boolean | null
          followup4: boolean | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          languages: string | null
          neighborhood: string | null
          onboarding_completed_at: string | null
          onboarding_data: Json
          onboarding_step: number
          phone: string
          professional_experience: string | null
          profile_complete: boolean | null
          residence_location: string | null
          rg: string | null
          role: Database["public"]["Enums"]["app_role"]
          salary_expectation: number | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string
          vessel_type: string | null
        }
        Insert: {
          address_complement?: string | null
          address_number?: string | null
          available_from?: string | null
          available_until?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_file_path?: string | null
          desired_function?: string | null
          email: string
          followup1?: boolean | null
          followup2?: boolean | null
          followup3?: boolean | null
          followup4?: boolean | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          languages?: string | null
          neighborhood?: string | null
          onboarding_completed_at?: string | null
          onboarding_data?: Json
          onboarding_step?: number
          phone: string
          professional_experience?: string | null
          profile_complete?: boolean | null
          residence_location?: string | null
          rg?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          salary_expectation?: number | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          vessel_type?: string | null
        }
        Update: {
          address_complement?: string | null
          address_number?: string | null
          available_from?: string | null
          available_until?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_file_path?: string | null
          desired_function?: string | null
          email?: string
          followup1?: boolean | null
          followup2?: boolean | null
          followup3?: boolean | null
          followup4?: boolean | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          languages?: string | null
          neighborhood?: string | null
          onboarding_completed_at?: string | null
          onboarding_data?: Json
          onboarding_step?: number
          phone?: string
          professional_experience?: string | null
          profile_complete?: boolean | null
          residence_location?: string | null
          rg?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          salary_expectation?: number | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          vessel_type?: string | null
        }
        Relationships: []
      }
      ranch_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          id: string
          item_name: string
          notes: string | null
          quantity: number
          total_value: number | null
          unit_price: number
          unit_type: string
          updated_at: string
          vessel_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          item_name: string
          notes?: string | null
          quantity?: number
          total_value?: number | null
          unit_price?: number
          unit_type: string
          updated_at?: string
          vessel_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          total_value?: number | null
          unit_price?: number
          unit_type?: string
          updated_at?: string
          vessel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranch_items_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "measurement_vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      "supabase-vivo": {
        Row: {
          created_at: string
          id: number
          teste: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          teste?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          teste?: string | null
        }
        Relationships: []
      }
      system_webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          updated_at: string
          updated_by: string | null
          webhook_key: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          updated_at?: string
          updated_by?: string | null
          webhook_key: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          updated_at?: string
          updated_by?: string | null
          webhook_key?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string[] | null
          client_id: string | null
          comments: Json
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          estimate_minutes: number | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project: string | null
          reminder_at: string | null
          sort_order: number | null
          start_date: string | null
          status_color: string
          status_name: string
          subtasks: Json
          tags: string[] | null
          time_spent_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string[] | null
          client_id?: string | null
          comments?: Json
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          estimate_minutes?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project?: string | null
          reminder_at?: string | null
          sort_order?: number | null
          start_date?: string | null
          status_color?: string
          status_name?: string
          subtasks?: Json
          tags?: string[] | null
          time_spent_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string[] | null
          client_id?: string | null
          comments?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimate_minutes?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project?: string | null
          reminder_at?: string | null
          sort_order?: number | null
          start_date?: string | null
          status_color?: string
          status_name?: string
          subtasks?: Json
          tags?: string[] | null
          time_spent_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ti_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          phone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ti_verification_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      agent_covers_public: {
        Row: {
          agent_id: string | null
          cover_url: string | null
          created_at: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_apply_to_job: {
        Args: { candidate_uuid: string; job_uuid: string }
        Returns: boolean
      }
      can_apply_to_job_enhanced: {
        Args: { candidate_uuid: string; job_uuid: string }
        Returns: boolean
      }
      check_certificate_validity: { Args: never; Returns: undefined }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      cleanup_orphaned_profiles: {
        Args: never
        Returns: {
          cleaned_applications: number
          cleaned_certifications: number
          cleaned_profiles: number
        }[]
      }
      get_admin_stats: {
        Args: never
        Returns: {
          active_jobs: number
          pending_applications: number
          total_applications: number
          total_candidates: number
          total_jobs: number
        }[]
      }
      get_qualified_candidates: {
        Args: { job_uuid: string }
        Returns: {
          desired_function: string
          email: string
          full_name: string
          has_relevant_experience: boolean
          has_stcw: boolean
          phone: string
          salary_expectation: number
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_client: { Args: { user_uuid: string }; Returns: boolean }
      is_company_admin: { Args: { company_id: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_ti: { Args: never; Returns: boolean }
      is_ti: { Args: { user_uuid: string }; Returns: boolean }
      votar_enquete: {
        Args: { opcao_index: number; post_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "candidate" | "client" | "ti"
      application_status:
        | "lista_espera"
        | "contato_realizado"
        | "finalizado"
        | "aprovado"
        | "rejeitado"
      boarding_status: "EM" | "REP" | "DS" | "DEMITIR"
      company_role: "company_admin" | "company_user"
      feed_post_type:
        | "texto"
        | "midia"
        | "evento"
        | "vaga"
        | "enquete"
        | "documento"
      gender: "masculino" | "feminino" | "outro"
      task_priority: "urgente" | "alta" | "normal" | "baixa"
      task_status:
        | "pendente"
        | "em_andamento"
        | "definindo_estrategia"
        | "concluida"
        | "cancelada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "candidate", "client", "ti"],
      application_status: [
        "lista_espera",
        "contato_realizado",
        "finalizado",
        "aprovado",
        "rejeitado",
      ],
      boarding_status: ["EM", "REP", "DS", "DEMITIR"],
      company_role: ["company_admin", "company_user"],
      feed_post_type: [
        "texto",
        "midia",
        "evento",
        "vaga",
        "enquete",
        "documento",
      ],
      gender: ["masculino", "feminino", "outro"],
      task_priority: ["urgente", "alta", "normal", "baixa"],
      task_status: [
        "pendente",
        "em_andamento",
        "definindo_estrategia",
        "concluida",
        "cancelada",
      ],
    },
  },
} as const
