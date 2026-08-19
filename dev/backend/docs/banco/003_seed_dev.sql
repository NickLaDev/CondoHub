-- CondoHub - DEV seed (local/dev only)
-- Password for created users (DEV ONLY): Admin@12345
-- IMPORTANT: change/delete these users in production.

DO $$
DECLARE
  v_plan_id uuid;
  v_instance_id uuid;
  v_block_id uuid;
  v_unit101 uuid;
  v_unit102 uuid;

  v_global_admin_id uuid;
  v_sindico_id uuid;
  v_morador101_id uuid;
BEGIN
  -- Plan
  SELECT id INTO v_plan_id FROM plans WHERE lower(name)=lower('DEV_PLAN') LIMIT 1;
  IF v_plan_id IS NULL THEN
    INSERT INTO plans (name, features_json, max_units, max_users, max_storage_mb)
    VALUES ('DEV_PLAN', '{"tickets":true,"deliveries":true,"communication":true}'::jsonb, 500, 2000, 10240)
    RETURNING id INTO v_plan_id;
  END IF;

  -- Instance
  SELECT id INTO v_instance_id FROM instances WHERE lower(instance_key)=lower('dev-condohub') LIMIT 1;
  IF v_instance_id IS NULL THEN
    INSERT INTO instances (plan_id, name, instance_key, status)
    VALUES (v_plan_id, 'CondoHub Dev', 'dev-condohub', 'ACTIVE'::instance_status)
    RETURNING id INTO v_instance_id;
  END IF;

  -- Condo profile (unique by instance_id)
  INSERT INTO condo_profiles (instance_id, name, address, phone)
  VALUES (v_instance_id, 'Condominio Exemplo', 'Rua Exemplo, 123 - Cidade/UF', '(00) 0000-0000')
  ON CONFLICT (instance_id) DO UPDATE
  SET name=EXCLUDED.name, address=EXCLUDED.address, phone=EXCLUDED.phone;

  -- Block (active)
  SELECT id INTO v_block_id
  FROM blocks
  WHERE instance_id=v_instance_id AND archived_at IS NULL AND lower(name)=lower('Bloco A')
  LIMIT 1;

  IF v_block_id IS NULL THEN
    INSERT INTO blocks (instance_id, name)
    VALUES (v_instance_id, 'Bloco A')
    RETURNING id INTO v_block_id;
  END IF;

  -- Units (active)
  SELECT id INTO v_unit101
  FROM units
  WHERE instance_id=v_instance_id AND block_id=v_block_id AND archived_at IS NULL AND lower(number)=lower('101')
  LIMIT 1;

  IF v_unit101 IS NULL THEN
    INSERT INTO units (instance_id, block_id, number)
    VALUES (v_instance_id, v_block_id, '101')
    RETURNING id INTO v_unit101;
  END IF;

  SELECT id INTO v_unit102
  FROM units
  WHERE instance_id=v_instance_id AND block_id=v_block_id AND archived_at IS NULL AND lower(number)=lower('102')
  LIMIT 1;

  IF v_unit102 IS NULL THEN
    INSERT INTO units (instance_id, block_id, number)
    VALUES (v_instance_id, v_block_id, '102')
    RETURNING id INTO v_unit102;
  END IF;

  -- Global admin (instance_id NULL)
  SELECT id INTO v_global_admin_id
  FROM users
  WHERE instance_id IS NULL AND lower(email::text)=lower('admin.global@dev.local')
  LIMIT 1;

  IF v_global_admin_id IS NULL THEN
    INSERT INTO users (instance_id, unit_id, name, email, roles, token_version, status)
    VALUES (NULL, NULL, 'Admin Global', 'admin.global@dev.local', ARRAY['ADMIN_GLOBAL'], 1, 'ACTIVE'::user_status)
    RETURNING id INTO v_global_admin_id;
  END IF;

  INSERT INTO user_credentials (user_id, password_hash, password_updated_at)
  VALUES (v_global_admin_id, '$2b$12$/yNS8skwTzeVwXWDV6IYh.x0wCBLBhDrFj2BEFTu9Erhh0h40AGnK', now())
  ON CONFLICT (user_id) DO UPDATE
  SET password_hash=EXCLUDED.password_hash, password_updated_at=EXCLUDED.password_updated_at;

  -- Tenant admin
  SELECT id INTO v_sindico_id
  FROM users
  WHERE instance_id=v_instance_id AND lower(email::text)=lower('admin@dev.local')
  LIMIT 1;

  IF v_sindico_id IS NULL THEN
    INSERT INTO users (instance_id, unit_id, name, email, roles, token_version, status)
    VALUES (v_instance_id, NULL, 'Sindico Admin', 'admin@dev.local', ARRAY['SINDICO_ADMIN'], 1, 'ACTIVE'::user_status)
    RETURNING id INTO v_sindico_id;
  END IF;

  INSERT INTO user_credentials (user_id, password_hash, password_updated_at)
  VALUES (v_sindico_id, '$2b$12$/yNS8skwTzeVwXWDV6IYh.x0wCBLBhDrFj2BEFTu9Erhh0h40AGnK', now())
  ON CONFLICT (user_id) DO UPDATE
  SET password_hash=EXCLUDED.password_hash, password_updated_at=EXCLUDED.password_updated_at;

  -- Resident 101
  SELECT id INTO v_morador101_id
  FROM users
  WHERE instance_id=v_instance_id AND lower(email::text)=lower('morador101@dev.local')
  LIMIT 1;

  IF v_morador101_id IS NULL THEN
    INSERT INTO users (instance_id, unit_id, name, email, roles, token_version, status)
    VALUES (v_instance_id, v_unit101, 'Morador 101', 'morador101@dev.local', ARRAY['MORADOR'], 1, 'ACTIVE'::user_status)
    RETURNING id INTO v_morador101_id;
  ELSE
    UPDATE users SET unit_id=v_unit101 WHERE id=v_morador101_id;
  END IF;

  INSERT INTO user_credentials (user_id, password_hash, password_updated_at)
  VALUES (v_morador101_id, '$2b$12$/yNS8skwTzeVwXWDV6IYh.x0wCBLBhDrFj2BEFTu9Erhh0h40AGnK', now())
  ON CONFLICT (user_id) DO UPDATE
  SET password_hash=EXCLUDED.password_hash, password_updated_at=EXCLUDED.password_updated_at;

END $$;
