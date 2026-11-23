-- Keep the existing sales RPC signature, grants, stock and payment logic.
do $migration$
declare
  definition text := pg_get_functiondef(
    'public.create_sale_with_current_price(text,uuid,integer,text)'::regprocedure
  );
  return_statement text := 'RETURN v_sale;';
  invoice_statement text := $invoice$
  INSERT INTO public.invoices (
    invoice_number, sale_id, customer_name, product_name, quantity,
    unit_price, total_amount, payment_method, payment_status,
    delivery_charge, additional_charges
  )
  VALUES (
    'INV-' || upper(replace(v_sale.id::text, '-', '')),
    v_sale.id, v_sale.customer_name, v_sale.product_name, v_sale.quantity,
    v_sale.unit_price, v_sale.total_amount, v_sale.payment_method,
    CASE
      WHEN v_sale.balance_due <= 0 AND v_sale.amount_paid >= v_sale.total_amount THEN 'Paid'
      WHEN v_sale.amount_paid > 0 THEN 'Partially Paid'
      ELSE 'Unpaid'
    END,
    coalesce(v_sale.delivery_charge, 0), coalesce(v_sale.additional_charges, 0)
  );

  RETURN v_sale;
$invoice$;
begin
  if position('INSERT INTO public.invoices' in definition) > 0 then
    return;
  end if;
  if (length(definition) - length(replace(definition, return_statement, ''))) <> length(return_statement) then
    raise exception 'Expected one sale return statement in create_sale_with_current_price';
  end if;
  -- Run in the same transaction as the sale and inventory deduction.
  execute replace(definition, return_statement, invoice_statement);
end;
$migration$;
