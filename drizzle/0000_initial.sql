-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    role TEXT DEFAULT 'tenant' CHECK (role IN ('admin', 'manager', 'tenant')),
    profile_image TEXT,
    archived BOOLEAN DEFAULT false,
    account_type TEXT DEFAULT 'individual' CHECK (account_type IN ('individual', 'enterprise')),
    parent_account_id INTEGER,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('apartment', 'house', 'commercial', 'parking', 'garage', 'land', 'office', 'building', 'storage')),
    units INTEGER DEFAULT 0,
    bedrooms INTEGER DEFAULT 0,
    floors INTEGER DEFAULT 0,
    bathrooms INTEGER DEFAULT 0,
    toilets INTEGER DEFAULT 0,
    energy_class TEXT CHECK (energy_class IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
    energy_emissions TEXT CHECK (energy_emissions IN ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
    living_area INTEGER DEFAULT 0,
    land_area INTEGER DEFAULT 0,
    has_parking BOOLEAN DEFAULT false,
    has_terrace BOOLEAN DEFAULT false,
    has_garage BOOLEAN DEFAULT false,
    has_outbuilding BOOLEAN DEFAULT false,
    has_balcony BOOLEAN DEFAULT false,
    has_elevator BOOLEAN DEFAULT false,
    has_cellar BOOLEAN DEFAULT false,
    has_garden BOOLEAN DEFAULT false,
    is_new_construction BOOLEAN DEFAULT false,
    purchase_price DECIMAL(10,2) DEFAULT 0,
    monthly_rent DECIMAL(10,2) DEFAULT 0,
    monthly_expenses DECIMAL(10,2),
    loan_amount DECIMAL(10,2) DEFAULT 0,
    monthly_loan_payment DECIMAL(10,2) DEFAULT 0,
    loan_duration INTEGER,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'maintenance', 'sold')),
    construction_year INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    property_id INTEGER NOT NULL REFERENCES properties(id),
    lease_start TIMESTAMP NOT NULL,
    lease_end TIMESTAMP NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    lease_type TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    lease_status TEXT DEFAULT 'actif',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    property_id INTEGER REFERENCES properties(id),
    tenant_id INTEGER REFERENCES tenants(id),
    document_id INTEGER,
    document_ids INTEGER[],
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'credit')),
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    date TIMESTAMP NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'failed', 'archived', 'deleted')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'bank_transfer', 'stripe', 'paypal', 'sepa', 'card', 'check')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create property_financial_snapshots table
CREATE TABLE IF NOT EXISTS property_financial_snapshots (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    gross_rental_yield NUMERIC(10,2),
    net_rental_yield NUMERIC(10,2),
    cash_on_cash_return NUMERIC(10,2),
    cap_rate NUMERIC(10,2),
    monthly_cash_flow NUMERIC(10,2),
    total_income NUMERIC(10,2),
    total_expenses NUMERIC(10,2),
    occupancy_rate NUMERIC(10,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'alert')),
    related_to TEXT CHECK (related_to IN ('property', 'tenant', 'maintenance')),
    related_id INTEGER,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'maintenance', 'lease', 'payment', 'other')),
    context JSONB DEFAULT '{}'
);

-- Create ai_suggestions table
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    property_id INTEGER REFERENCES properties(id),
    type TEXT NOT NULL CHECK (type IN ('rent_price', 'maintenance', 'tenant_management', 'investment')),
    suggestion TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected'))
);

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
); 