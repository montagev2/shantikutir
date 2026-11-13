-- Shanti Kutir - PostgreSQL Schema
-- Paste this entire file into the Supabase SQL Editor and run it.
-- This creates all tables, RLS policies, RPCs, and seeds the starter menu.
-- Zero Food Garden data or credentials here.

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text UNIQUE NOT NULL,
  pin_hash    text NOT NULL,
  name        text,
  role        text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin')),
  last_active timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  name_bn     text,
  description text,
  category    text NOT NULL,
  price_a     numeric(10,2) NOT NULL,
  price_b     numeric(10,2),
  price_c     numeric(10,2),
  label_a     text NOT NULL DEFAULT 'Regular',
  label_b     text,
  label_c     text,
  in_stock    boolean NOT NULL DEFAULT true,
  archived    boolean NOT NULL DEFAULT false,
  image_url   text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id               text PRIMARY KEY,
  customer_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name    text NOT NULL,
  customer_phone   text NOT NULL,
  dining_mode      text NOT NULL CHECK (dining_mode IN ('dine_in', 'takeaway', 'delivery')),
  table_number     text,
  delivery_address text,
  delivery_lat     double precision,
  delivery_lng     double precision,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','ready','delivered','cancelled')),
  subtotal         numeric(10,2) NOT NULL,
  discount_amount  numeric(10,2) NOT NULL DEFAULT 0,
  total            numeric(10,2) NOT NULL,
  payment_method   text NOT NULL CHECK (payment_method IN ('upi', 'cash')),
  utr_number       text,
  utr_verified     boolean NOT NULL DEFAULT false,
  otp_code         text,
  otp_used         boolean NOT NULL DEFAULT false,
  rating           int CHECK (rating BETWEEN 1 AND 5),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id   uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  size_label   text NOT NULL,
  price        numeric(10,2) NOT NULL,
  quantity     int NOT NULL CHECK (quantity > 0)
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text UNIQUE NOT NULL,
  discount_type  text NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value numeric(10,2) NOT NULL,
  min_order      numeric(10,2) NOT NULL DEFAULT 0,
  max_uses       int,
  used_count     int NOT NULL DEFAULT 0,
  active         boolean NOT NULL DEFAULT true,
  expires_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date   date UNIQUE NOT NULL,
  total_orders  int NOT NULL DEFAULT 0,
  total_revenue numeric(10,2) NOT NULL DEFAULT 0,
  notes         text,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Public read on products (for menu display)
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT TO anon, authenticated USING (archived = false);

-- No direct writes - all mutations via SECURITY DEFINER RPCs
CREATE POLICY "no_direct_writes_profiles" ON public.profiles
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "no_direct_writes_orders" ON public.orders
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "no_direct_writes_order_items" ON public.order_items
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "no_direct_writes_coupons" ON public.coupons
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "no_direct_writes_daily_reports" ON public.daily_reports
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ============================================================
-- RPCs (all SECURITY DEFINER)
-- ============================================================

-- Verify login
CREATE OR REPLACE FUNCTION public.verify_login(p_phone text, p_pin text)
RETURNS TABLE(id uuid, phone text, name text, role text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT pr.id, pr.phone, pr.name, pr.role, pr.created_at
  FROM public.profiles pr
  WHERE pr.phone = p_phone
    AND pr.pin_hash = crypt(p_pin, pr.pin_hash);

  UPDATE public.profiles
  SET last_active = now()
  WHERE phone = p_phone
    AND pin_hash = crypt(p_pin, pin_hash);
END;
$$;

-- Register or upgrade customer
CREATE OR REPLACE FUNCTION public.register_or_upgrade_customer_secure(
  p_phone text,
  p_pin   text,
  p_name  text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_hash text;
  v_id   uuid;
  v_role text;
BEGIN
  v_hash := crypt(p_pin, gen_salt('bf'));
  INSERT INTO public.profiles (phone, pin_hash, name, role)
  VALUES (p_phone, v_hash, p_name, 'customer')
  ON CONFLICT (phone) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        name     = EXCLUDED.name,
        last_active = now()
  RETURNING id, role INTO v_id, v_role;

  RETURN jsonb_build_object('id', v_id, 'phone', p_phone, 'name', p_name, 'role', v_role);
END;
$$;

-- Submit order (anon-safe)
CREATE OR REPLACE FUNCTION public.submit_order_secure(
  p_customer_id      uuid,
  p_customer_name    text,
  p_customer_phone   text,
  p_dining_mode      text,
  p_table_number     text,
  p_delivery_address text,
  p_delivery_lat     double precision,
  p_delivery_lng     double precision,
  p_items            jsonb,
  p_subtotal         numeric,
  p_discount_amount  numeric,
  p_total            numeric,
  p_payment_method   text,
  p_coupon_code      text
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id  text;
  v_item      jsonb;
  v_otp       text;
BEGIN
  -- Generate SK-DDMM-XXX order id
  v_order_id := 'SK-' || TO_CHAR(now(), 'DDMM') || '-' || LPAD(FLOOR(RANDOM()*900+100)::text, 3, '0');

  -- Generate OTP for delivery orders
  IF p_dining_mode = 'delivery' THEN
    v_otp := LPAD(FLOOR(RANDOM()*9000+1000)::text, 4, '0');
  END IF;

  INSERT INTO public.orders (
    id, customer_id, customer_name, customer_phone,
    dining_mode, table_number, delivery_address, delivery_lat, delivery_lng,
    status, subtotal, discount_amount, total,
    payment_method, otp_code
  ) VALUES (
    v_order_id, p_customer_id, p_customer_name, p_customer_phone,
    p_dining_mode, p_table_number, p_delivery_address, p_delivery_lat, p_delivery_lng,
    'pending', p_subtotal, p_discount_amount, p_total,
    p_payment_method, v_otp
  );

  -- Insert items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, product_name, size_label, price, quantity)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      v_item->>'size_label',
      (v_item->>'price')::numeric,
      (v_item->>'quantity')::int
    );
  END LOOP;

  -- Increment coupon use count
  IF p_coupon_code IS NOT NULL THEN
    UPDATE public.coupons SET used_count = used_count + 1 WHERE code = p_coupon_code AND active = true;
  END IF;

  RETURN v_order_id;
END;
$$;

-- Track order publicly (no auth)
CREATE OR REPLACE FUNCTION public.track_order_public(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'dining_mode', o.dining_mode,
    'total', o.total,
    'created_at', o.created_at
  ) INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  RETURN v_order;
END;
$$;

-- Update order status (staff)
CREATE OR REPLACE FUNCTION public.update_order_status_secure(
  p_order_id  text,
  p_new_status text,
  p_staff_id  text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_staff_id::uuid;
  IF v_role NOT IN ('staff', 'admin') THEN
    RAISE EXCEPTION 'Unauthorised';
  END IF;

  UPDATE public.orders
  SET status = p_new_status, updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- Verify UTR
CREATE OR REPLACE FUNCTION public.verify_utr_secure(
  p_order_id text,
  p_staff_id text,
  p_verified boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_staff_id::uuid;
  IF v_role NOT IN ('staff', 'admin') THEN
    RAISE EXCEPTION 'Unauthorised';
  END IF;

  UPDATE public.orders SET utr_verified = p_verified WHERE id = p_order_id;
END;
$$;

-- Get all orders (staff)
CREATE OR REPLACE FUNCTION public.get_all_orders_staff()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'customer_id', o.customer_id,
        'customer_name', o.customer_name,
        'customer_phone', o.customer_phone,
        'dining_mode', o.dining_mode,
        'table_number', o.table_number,
        'delivery_address', o.delivery_address,
        'status', o.status,
        'subtotal', o.subtotal,
        'discount_amount', o.discount_amount,
        'total', o.total,
        'payment_method', o.payment_method,
        'utr_number', o.utr_number,
        'utr_verified', o.utr_verified,
        'otp_code', o.otp_code,
        'otp_used', o.otp_used,
        'rating', o.rating,
        'created_at', o.created_at,
        'items', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', i.id,
            'product_id', i.product_id,
            'product_name', i.product_name,
            'size_label', i.size_label,
            'price', i.price,
            'quantity', i.quantity
          ))
          FROM public.order_items i WHERE i.order_id = o.id
        )
      ) ORDER BY o.created_at DESC
    )
    FROM public.orders o
  );
END;
$$;

-- Get all users (admin)
CREATE OR REPLACE FUNCTION public.get_all_users_staff()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'phone', p.phone,
        'name', p.name,
        'role', p.role,
        'created_at', p.created_at,
        'last_active', p.last_active
      ) ORDER BY p.created_at DESC
    )
    FROM public.profiles p
  );
END;
$$;

-- Update own profile
CREATE OR REPLACE FUNCTION public.update_own_profile_secure(p_user_id uuid, p_name text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET name = p_name WHERE id = p_user_id;
END;
$$;

-- Update own PIN
CREATE OR REPLACE FUNCTION public.update_own_pin_secure(
  p_user_id uuid,
  p_old_pin text,
  p_new_pin text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT pin_hash INTO v_hash FROM public.profiles WHERE id = p_user_id;
  IF v_hash IS NULL OR v_hash != crypt(p_old_pin, v_hash) THEN
    RAISE EXCEPTION 'Incorrect current PIN';
  END IF;
  UPDATE public.profiles SET pin_hash = crypt(p_new_pin, gen_salt('bf')) WHERE id = p_user_id;
END;
$$;

-- Keepalive ping
CREATE OR REPLACE FUNCTION public.keepalive_ping()
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 1;
$$;

-- Rate order
CREATE OR REPLACE FUNCTION public.rate_order_secure(p_order_id text, p_rating int)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be 1-5';
  END IF;
  UPDATE public.orders SET rating = p_rating WHERE id = p_order_id AND rating IS NULL;
END;
$$;

-- Get active coupons for user
CREATE OR REPLACE FUNCTION public.get_active_coupons_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'code', c.code,
      'discount_type', c.discount_type,
      'discount_value', c.discount_value,
      'min_order', c.min_order,
      'expires_at', c.expires_at
    ))
    FROM public.coupons c
    WHERE c.active = true
      AND (c.expires_at IS NULL OR c.expires_at > now())
      AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
  );
END;
$$;

-- Delete orders (admin)
CREATE OR REPLACE FUNCTION public.delete_orders_secure(p_order_ids text[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.orders WHERE id = ANY(p_order_ids);
END;
$$;

-- Update product price and stock
CREATE OR REPLACE FUNCTION public.update_product_price_and_stock(
  p_product_id uuid,
  p_p_a        numeric,
  p_p_b        numeric,
  p_p_c        numeric,
  p_in_stock   boolean,
  p_archived   boolean
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET price_a = p_p_a,
      price_b = p_p_b,
      price_c = p_p_c,
      in_stock = p_in_stock,
      archived = p_archived
  WHERE id = p_product_id;
END;
$$;

-- Reset all products stock
CREATE OR REPLACE FUNCTION public.reset_all_products_stock_secure()
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.products SET in_stock = true WHERE archived = false;
$$;

-- Upsert daily report
CREATE OR REPLACE FUNCTION public.upsert_daily_report_secure(
  p_report_date  date,
  p_total_orders int,
  p_total_revenue numeric,
  p_notes        text,
  p_created_by   uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.daily_reports (report_date, total_orders, total_revenue, notes, created_by)
  VALUES (p_report_date, p_total_orders, p_total_revenue, p_notes, p_created_by)
  ON CONFLICT (report_date) DO UPDATE
    SET total_orders  = EXCLUDED.total_orders,
        total_revenue = EXCLUDED.total_revenue,
        notes         = EXCLUDED.notes;
END;
$$;

-- Admin create coupon
CREATE OR REPLACE FUNCTION public.admin_create_coupon_secure(
  p_code           text,
  p_discount_type  text,
  p_discount_value numeric,
  p_min_order      numeric,
  p_max_uses       int,
  p_expires_at     timestamptz
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.coupons (code, discount_type, discount_value, min_order, max_uses, expires_at)
  VALUES (UPPER(p_code), p_discount_type, p_discount_value, p_min_order, p_max_uses, p_expires_at);
END;
$$;

-- Admin toggle coupon
CREATE OR REPLACE FUNCTION public.admin_toggle_coupon_secure(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.coupons SET active = NOT active WHERE id = p_coupon_id;
END;
$$;

-- Admin delete coupon
CREATE OR REPLACE FUNCTION public.admin_delete_coupon_secure(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.coupons WHERE id = p_coupon_id;
END;
$$;

-- Admin create staff
CREATE OR REPLACE FUNCTION public.admin_create_staff_secure(
  p_phone text,
  p_name  text,
  p_pin   text,
  p_role  text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_role NOT IN ('staff', 'admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  INSERT INTO public.profiles (phone, pin_hash, name, role)
  VALUES (p_phone, crypt(p_pin, gen_salt('bf')), p_name, p_role)
  ON CONFLICT (phone) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        name     = EXCLUDED.name,
        role     = EXCLUDED.role;
END;
$$;

-- Admin delete user
CREATE OR REPLACE FUNCTION public.admin_delete_user_secure(p_target_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = p_target_id AND role != 'admin';
END;
$$;

-- Approve extended delivery
CREATE OR REPLACE FUNCTION public.approve_extended_delivery_secure(p_order_id text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.orders SET delivery_address = COALESCE(delivery_address, '') || ' [EXTENDED]' WHERE id = p_order_id;
END;
$$;

-- ============================================================
-- STARTER MENU SEED DATA
-- Authentic Bengali highway restaurant menu for Shanti Kutir
-- ============================================================

INSERT INTO public.products (name, name_bn, description, category, price_a, label_a, sort_order) VALUES
  ('Kutir Signature Thali', 'কুটির সিগনেচার থালি',
   'Our flagship thali - rice, dal, two sabzi, fish curry, papad, chutney, mishti doi',
   'Kutir Signature Thali', 220, 'Full Thali', 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (name, name_bn, description, category, price_a, price_b, label_a, label_b, sort_order) VALUES
  ('Chicken Dum Biryani', 'চিকেন দম বিরিয়ানি',
   'Slow-cooked Kolkata-style dum biryani with aromatic basmati and juicy chicken',
   'Biryani', 160, 220, 'Half', 'Full', 10),
  ('Mutton Kacchi Dum Biryani', 'মটন কাচ্চি দম বিরিয়ানি',
   'Tender mutton layered with saffron basmati, cooked Kacchi-style',
   'Biryani', 200, 280, 'Half', 'Full', 11),
  ('Prawn Biryani', 'চিংড়ি বিরিয়ানি',
   'Fresh prawns in spiced dum biryani, Bengali style',
   'Biryani', 180, 250, 'Half', 'Full', 12),
  ('Veg Biryani', 'ভেজ বিরিয়ানি',
   'Seasonal vegetables in fragrant basmati with whole spices',
   'Biryani', 120, 170, 'Half', 'Full', 13)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (name, name_bn, description, category, price_a, label_a, sort_order) VALUES
  ('Rohu Fish Curry', 'রুই মাছের ঝোল',
   'Classic Bengali rui macher jhol with potato, turmeric, and green chilli',
   'Fish Curry', 140, 'Plate', 20),
  ('Katla Fish Curry', 'কাতলা মাছের কালিয়া',
   'Rich katla curry in onion-tomato gravy with ginger and garam masala',
   'Fish Curry', 160, 'Plate', 21),
  ('Prawn Masala', 'চিংড়ি মাছের মালাইকারি',
   'Succulent prawns in creamy coconut-mustard sauce',
   'Fish Curry', 180, 'Plate', 22),
  ('Ilish Paturi', 'ইলিশ পাতুড়ি',
   'Hilsa marinated in mustard-turmeric paste, steamed in banana leaf',
   'Fish Curry', 220, 'Plate', 23)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (name, name_bn, description, category, price_a, label_a, sort_order) VALUES
  ('Chicken Chaap', 'চিকেন চাপ',
   'Kolkata-style slow-cooked chicken in rich brown onion gravy',
   'Chicken Curry', 170, 'Plate', 30),
  ('Butter Chicken', 'বাটার চিকেন',
   'Tender chicken in velvety tomato-cream sauce, mildly spiced',
   'Chicken Curry', 180, 'Plate', 31),
  ('Chicken Bharta', 'চিকেন ভর্তা',
   'Smoky mashed chicken with roasted garlic and green chilli',
   'Chicken Curry', 160, 'Plate', 32),
  ('Chicken Kosha', 'চিকেন কষা',
   'Dry-roasted chicken with caramelised onion and Bengali spices',
   'Chicken Curry', 160, 'Plate', 33)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (name, name_bn, description, category, price_a, price_b, label_a, label_b, sort_order) VALUES
  ('Chicken Tikka', 'চিকেন টিক্কা',
   'Juicy boneless chicken marinated in yoghurt and spices, char-grilled',
   'Tandoor', 180, 280, 'Half (4 pcs)', 'Full (8 pcs)', 40),
  ('Malai Kebab', 'মালাই কাবাব',
   'Creamy, melt-in-mouth chicken kebab with cashew and cheese',
   'Tandoor', 200, 320, 'Half (4 pcs)', 'Full (8 pcs)', 41),
  ('Seekh Kebab', 'শিক কাবাব',
   'Spiced minced chicken skewers grilled over charcoal',
   'Tandoor', 160, 260, 'Half (4 pcs)', 'Full (8 pcs)', 42),
  ('Paneer Tikka', 'পনির টিক্কা',
   'Marinated cottage cheese cubes grilled with bell pepper and onion',
   'Tandoor', 160, 260, 'Half (4 pcs)', 'Full (8 pcs)', 43)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (name, name_bn, description, category, price_a, label_a, sort_order) VALUES
  ('Steamed Rice', 'সিদ্ধ ভাত', NULL, 'Rice & Roti', 40, 'Plate', 50),
  ('Butter Naan', 'বাটার নান', NULL, 'Rice & Roti', 35, 'Piece', 51),
  ('Roomali Roti', 'রুমালি রুটি', NULL, 'Rice & Roti', 25, 'Piece', 52),
  ('Laccha Paratha', 'লাচ্ছা পরাঠা', NULL, 'Rice & Roti', 35, 'Piece', 53),
  ('Dal Tadka', 'ডাল তড়কা', 'Yellow lentils tempered with cumin, garlic, and dried chilli', 'Rice & Roti', 80, 'Bowl', 54)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (name, name_bn, description, category, price_a, label_a, sort_order) VALUES
  ('Masala Tea', 'মশলা চা', 'Freshly brewed tea with ginger, cardamom, and tulsi', 'Beverages', 20, 'Cup', 60),
  ('Sweet Lassi', 'মিষ্টি লাচ্ছি', 'Chilled yoghurt drink, lightly sweetened', 'Beverages', 50, 'Glass', 61),
  ('Lemon Soda', 'লেমন সোডা', 'Freshly squeezed lemon with soda and black salt', 'Beverages', 40, 'Glass', 62),
  ('Cold Drink', 'কোল্ড ড্রিংক', 'Pepsi / 7Up / Mirinda (can)', 'Beverages', 30, 'Can', 63)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (name, name_bn, description, category, price_a, label_a, sort_order) VALUES
  ('Mishti Doi', 'মিষ্টি দই', 'Bengali sweetened curd set in earthen pot', 'Sweets', 50, 'Pot', 70),
  ('Payesh', 'পায়েস', 'Rice kheer cooked in full-cream milk with jaggery and cardamom', 'Sweets', 60, 'Bowl', 71),
  ('Rasgolla', 'রসগোল্লা', 'Soft, spongy chenna balls soaked in light sugar syrup', 'Sweets', 20, 'Piece', 72)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DONE
-- Run this in Supabase SQL Editor. Then set your VITE_SUPABASE_URL
-- and VITE_SUPABASE_ANON_KEY in your .env file.
-- ============================================================
