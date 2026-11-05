-- Reject missing profiles and null roles before accessing stock or creating sales.
-- Follow-up migration for databases that already applied the website-order migration.
CREATE OR REPLACE FUNCTION public.create_sale_with_current_price(p_customer_name text, p_product_id uuid, p_quantity integer, p_payment_method text)
 RETURNS sales
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

DECLARE
  v_user_id uuid;
  v_user_role text;

  v_product_name text;
  v_unit_price numeric := 0;

  v_available_quantity integer := 0;

  v_cost_per_unit numeric := 0;

  v_total_amount numeric := 0;
  v_amount_paid numeric := 0;
  v_balance_due numeric := 0;

  v_cogs numeric := 0;
  v_gross_profit numeric := 0;
  v_gross_margin numeric := 0;

  v_sale public.sales;

BEGIN

  /* ============================================================
     OPTIONAL USER ID

     auth.uid() may be NULL when running directly
     from Supabase SQL Editor.
     ============================================================ */

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_user_role IS NULL OR v_user_role NOT IN ('admin', 'manager', 'operator') THEN
    RAISE EXCEPTION 'You do not have permission to create sales.';
  END IF;


  /* ============================================================
     VALIDATION
     ============================================================ */

  IF p_customer_name IS NULL
     OR trim(p_customer_name) = '' THEN

    RAISE EXCEPTION
      'Customer name is required.';

  END IF;


  IF p_product_id IS NULL THEN

    RAISE EXCEPTION
      'Product is required.';

  END IF;


  IF p_quantity IS NULL
     OR p_quantity <= 0 THEN

    RAISE EXCEPTION
      'Quantity must be greater than zero.';

  END IF;


  IF p_payment_method IS NULL
     OR trim(p_payment_method) = '' THEN

    RAISE EXCEPTION
      'Payment method is required.';

  END IF;


  /* ============================================================
     GET PRODUCT
     ============================================================ */

  SELECT
    name,
    price
  INTO
    v_product_name,
    v_unit_price
  FROM public.products
  WHERE id = p_product_id;


  IF NOT FOUND THEN

    RAISE EXCEPTION
      'Product with ID % was not found.',
      p_product_id;

  END IF;


  /* ============================================================
     VALIDATE SELLING PRICE
     ============================================================ */

  v_unit_price :=
    COALESCE(
      v_unit_price,
      0
    );


  IF v_unit_price <= 0 THEN

    RAISE EXCEPTION
      'Product "%" does not have a valid selling price.',
      v_product_name;

  END IF;


  /* ============================================================
     GET FINISHED GOODS INVENTORY

     Lock the row while processing the sale.
     ============================================================ */

  SELECT
    quantity,
    unit_cost
  INTO
    v_available_quantity,
    v_cost_per_unit
  FROM public.finished_goods_inventory
  WHERE product_name = v_product_name
  FOR UPDATE;


  IF NOT FOUND THEN

    RAISE EXCEPTION
      'No finished goods inventory exists for product "%".',
      v_product_name;

  END IF;


  /* ============================================================
     VALIDATE INVENTORY
     ============================================================ */

  v_available_quantity :=
    COALESCE(
      v_available_quantity,
      0
    );


  IF v_available_quantity < p_quantity THEN

    RAISE EXCEPTION
      'Insufficient stock for "%". Available: %, Requested: %.',
      v_product_name,
      v_available_quantity,
      p_quantity;

  END IF;


  /* ============================================================
     GET COST PER UNIT
     ============================================================ */

  v_cost_per_unit :=
    COALESCE(
      v_cost_per_unit,
      0
    );


  /* ============================================================
     CALCULATE SALE TOTAL
     ============================================================ */

  v_total_amount :=
    p_quantity
    * v_unit_price;


  /* ============================================================
     CALCULATE COGS
     ============================================================ */

  v_cogs :=
    p_quantity
    * v_cost_per_unit;


  /* ============================================================
     CALCULATE GROSS PROFIT
     ============================================================ */

  v_gross_profit :=
    v_total_amount
    - v_cogs;


  /* ============================================================
     CALCULATE GROSS MARGIN
     ============================================================ */

  v_gross_margin :=
    CASE

      WHEN v_total_amount > 0 THEN

        (
          v_gross_profit
          / v_total_amount
        )
        * 100

      ELSE
        0

    END;


  /* ============================================================
     PAYMENT HANDLING

     CREDIT = unpaid initially.

     CASH / other payment methods = fully paid.
     ============================================================ */

  IF lower(trim(p_payment_method)) = 'credit' THEN

    v_amount_paid := 0;

    v_balance_due :=
      v_total_amount;

  ELSE

    v_amount_paid :=
      v_total_amount;

    v_balance_due := 0;

  END IF;


  /* ============================================================
     DEDUCT FINISHED GOODS INVENTORY
     ============================================================ */

  UPDATE public.finished_goods_inventory

  SET

    quantity =
      quantity
      - p_quantity,


    costed_quantity =
      CASE

        WHEN costed_quantity IS NULL THEN
          GREATEST(
            0,
            quantity - p_quantity
          )

        WHEN costed_quantity - p_quantity < 0 THEN
          0

        ELSE
          costed_quantity
          - p_quantity

      END,


    total_cost =
      CASE

        WHEN quantity - p_quantity <= 0 THEN
          0

        ELSE
          (
            quantity - p_quantity
          )
          * v_cost_per_unit

      END,


    unit_cost =
      CASE

        WHEN quantity - p_quantity <= 0 THEN
          0

        ELSE
          v_cost_per_unit

      END,


    updated_at =
      now()

  WHERE product_name =
    v_product_name;


  /* ============================================================
     CREATE SALE RECORD
     ============================================================ */

  INSERT INTO public.sales (

    customer_name,
    product_name,
    quantity,
    unit_price,
    total_amount,
    payment_method,
    amount_paid,
    balance_due,
    cost_per_unit,
    cogs,
    gross_profit,
    gross_margin

  )

  VALUES (

    trim(p_customer_name),

    v_product_name,

    p_quantity,

    v_unit_price,

    v_total_amount,

    trim(p_payment_method),

    v_amount_paid,

    v_balance_due,

    v_cost_per_unit,

    v_cogs,

    v_gross_profit,

    v_gross_margin

  )

  RETURNING *
  INTO v_sale;


  /* ============================================================
     RETURN CREATED SALE
     ============================================================ */

  RETURN v_sale;

END;

$function$
;

revoke execute on function public.create_sale_with_current_price(text, uuid, integer, text) from public, anon;
grant execute on function public.create_sale_with_current_price(text, uuid, integer, text) to authenticated, service_role;
