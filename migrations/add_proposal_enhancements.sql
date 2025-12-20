-- Migration: Add proposal templates, branding, and enhancements
-- Created: 2025-12-19
-- Description: Adds tables for proposal templates, company branding, and updates proposals table

-- =====================================================
-- 1. PROPOSAL TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS proposal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    template_content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_proposal_templates_user_id ON proposal_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_templates_is_default ON proposal_templates(is_default) WHERE is_default = true;

-- =====================================================
-- 2. COMPANY BRANDING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS company_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    logo_url TEXT,
    company_name VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    tax_number VARCHAR(50),
    primary_color VARCHAR(7) DEFAULT '#6366f1',
    secondary_color VARCHAR(7) DEFAULT '#8b5cf6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_branding_user_id ON company_branding(user_id);

-- =====================================================
-- 3. UPDATE PROPOSALS TABLE
-- =====================================================
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES proposal_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS use_branding BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pdf_generated_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- 4. INSERT DEFAULT TEMPLATES
-- =====================================================

-- Template 1: Standard Proposal
INSERT INTO proposal_templates (name, description, is_default, template_content)
VALUES (
    'Standart Teklif',
    'Genel amaçlı teklif şablonu',
    true,
    '{
        "sections": [
            {"type": "header", "showLogo": true, "showCompanyInfo": true},
            {"type": "customer_info", "fields": ["name", "phone", "email"]},
            {"type": "proposal_info", "fields": ["number", "date", "valid_until"]},
            {"type": "items_table", "columns": ["name", "quantity", "unit_price", "total"]},
            {"type": "totals", "showSubtotal": true, "showTax": true, "showTotal": true},
            {"type": "notes", "placeholder": "Ödeme koşulları ve notlar..."}
        ],
        "styling": {
            "fontSize": 11,
            "headerFontSize": 18,
            "theme": "modern"
        }
    }'::jsonb
);

-- Template 2: Detailed Proposal
INSERT INTO proposal_templates (name, description, is_default, template_content)
VALUES (
    'Detaylı Teklif',
    'Açıklamalı ve opsiyonlu teklif şablonu',
    true,
    '{
        "sections": [
            {"type": "header", "showLogo": true, "showCompanyInfo": true},
            {"type": "customer_info", "fields": ["name", "phone", "email", "address"]},
            {"type": "proposal_info", "fields": ["number", "date", "valid_until", "reference"]},
            {"type": "items_table", "columns": ["name", "description", "quantity", "unit_price", "total"]},
            {"type": "totals", "showSubtotal": true, "showDiscount": true, "showTax": true, "showTotal": true},
            {"type": "terms", "title": "Şartlar ve Koşullar"},
            {"type": "notes", "placeholder": "Ek bilgiler ve notlar..."}
        ],
        "styling": {
            "fontSize": 10,
            "headerFontSize": 20,
            "theme": "professional"
        }
    }'::jsonb
);

-- Template 3: Quick Price
INSERT INTO proposal_templates (name, description, is_default, template_content)
VALUES (
    'Hızlı Fiyat Teklifi',
    'Minimalist ve hızlı teklif',
    true,
    '{
        "sections": [
            {"type": "header", "showLogo": true, "showCompanyInfo": false},
            {"type": "customer_info", "fields": ["name"]},
            {"type": "proposal_info", "fields": ["number", "date"]},
            {"type": "items_table", "columns": ["name", "quantity", "total"]},
            {"type": "totals", "showSubtotal": false, "showTax": false, "showTotal": true}
        ],
        "styling": {
            "fontSize": 12,
            "headerFontSize": 16,
            "theme": "minimal"
        }
    }'::jsonb
);

-- Template 4: Corporate
INSERT INTO proposal_templates (name, description, is_default, template_content)
VALUES (
    'Kurumsal Teklif',
    'Profesyonel ve kurumsal görünüm',
    true,
    '{
        "sections": [
            {"type": "header", "showLogo": true, "showCompanyInfo": true, "showDate": true},
            {"type": "introduction", "placeholder": "Değerli müşterimiz..."},
            {"type": "customer_info", "fields": ["name", "company", "phone", "email", "address"]},
            {"type": "proposal_info", "fields": ["number", "date", "valid_until", "prepared_by"]},
            {"type": "items_table", "columns": ["name", "description", "quantity", "unit_price", "discount", "total"]},
            {"type": "totals", "showSubtotal": true, "showDiscount": true, "showTax": true, "showTotal": true},
            {"type": "payment_terms", "title": "Ödeme Koşulları"},
            {"type": "terms", "title": "Genel Şartlar"},
            {"type": "signature", "fields": ["company", "customer"]}
        ],
        "styling": {
            "fontSize": 11,
            "headerFontSize": 22,
            "theme": "corporate"
        }
    }'::jsonb
);

-- =====================================================
-- 5. COMMENTS
-- =====================================================
COMMENT ON TABLE proposal_templates IS 'Stores reusable proposal templates';
COMMENT ON TABLE company_branding IS 'Stores company branding settings for proposals';
COMMENT ON COLUMN proposals.template_id IS 'Reference to the template used for this proposal';
COMMENT ON COLUMN proposals.use_branding IS 'Whether to apply company branding to this proposal';
COMMENT ON COLUMN proposals.pdf_generated_url IS 'URL to the generated PDF file';
