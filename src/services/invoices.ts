import { supabase } from "@/lib/supabase/client";

/* =========================================================
   TYPES
========================================================= */

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  delivery_charge?: number;
  additional_charges?: number;
  payment_status: string | null;
  sale_id: string | null;
  created_at: string;
}

export interface InvoiceWithSale
  extends Invoice {
  amount_paid: number;
  balance_due: number;
  payment_method: string;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

/* =========================================================
   HELPER
========================================================= */

function mapInvoice(
  invoice: any,
  sale: any | null = null
): InvoiceWithSale {
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    customer_name: invoice.customer_name,
    product_name: invoice.product_name || "",
    quantity: Number(invoice.quantity || 0),
    unit_price: Number(invoice.unit_price || 0),
    total_amount: Number(invoice.total_amount || 0),
    delivery_charge: Number(invoice.delivery_charge || 0),
    additional_charges: Number(invoice.additional_charges || 0),
    payment_status: invoice.payment_status,
    sale_id: invoice.sale_id || null,
    created_at: invoice.created_at,

    amount_paid: Number(
      sale?.amount_paid || 0
    ),

    balance_due: Number(
      sale?.balance_due || 0
    ),

    payment_method:
      sale?.payment_method || "",
  };
}

/* =========================================================
   GET ALL INVOICES
========================================================= */

export async function getInvoices(): Promise<{
  data: InvoiceWithSale[] | null;
  error: Error | null;
}> {
  const {
    data: invoices,
    error,
  } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      customer_name,
      product_name,
      quantity,
      unit_price,
      total_amount,
      payment_status,
      sale_id,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getInvoices error:",
      error.message,
      error.details,
      error.hint,
      error.code
    );

    return {
      data: null,
      error: new Error(
        error.message ||
          "Unable to load invoices."
      ),
    };
  }

  if (!invoices?.length) {
    return {
      data: [],
      error: null,
    };
  }

  const saleIds = Array.from(
    new Set(
      invoices
        .map(
          (invoice) =>
            invoice.sale_id
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(id)
        )
    )
  );

  const salesById =
    new Map<string, any>();

  if (saleIds.length > 0) {
    const {
      data: sales,
      error: salesError,
    } = await supabase
      .from("sales")
      .select(`
        id,
        amount_paid,
        balance_due,
        payment_method
      `)
      .in("id", saleIds);

    if (salesError) {
      console.error(
        "getInvoices sales error:",
        salesError.message,
        salesError.details,
        salesError.hint,
        salesError.code
      );

      return {
        data: null,
        error: new Error(
          salesError.message ||
            "Unable to load invoice sales."
        ),
      };
    }

    for (const sale of sales || []) {
      salesById.set(
        sale.id,
        sale
      );
    }
  }

  const result =
    invoices.map(
      (invoice) => {
        const sale =
          invoice.sale_id
            ? salesById.get(
                invoice.sale_id
              ) || null
            : null;

        return mapInvoice(
          invoice,
          sale
        );
      }
    );

  return {
    data: result,
    error: null,
  };
}

/* =========================================================
   GET INVOICE BY NUMBER
========================================================= */

export async function getInvoiceByNumber(
  invoiceNumber: string
): Promise<{
  data: InvoiceWithSale | null;
  error: Error | null;
}> {
  if (!invoiceNumber?.trim()) {
    return {
      data: null,
      error: new Error(
        "Invoice number is required."
      ),
    };
  }

  const lookupValue =
    invoiceNumber.trim();

  const {
    data: invoices,
    error,
  } = await supabase
    .from("invoices")
    .select(`
      id,
      invoice_number,
      customer_name,
      product_name,
      quantity,
      unit_price,
      total_amount,
      payment_status,
      sale_id,
      created_at
    `)
    .eq(
      "invoice_number",
      lookupValue
    )
    .limit(1);

  if (error) {
    console.error(
      "getInvoiceByNumber error:",
      error.message,
      error.details,
      error.hint,
      error.code
    );

    return {
      data: null,
      error: new Error(
        error.message ||
          "Unable to load invoice."
      ),
    };
  }

  console.log(
    "Invoice number lookup result:",
    {
      lookupValue,
      data: invoices,
      count: invoices?.length ?? 0,
      error,
    }
  );

  const invoice =
    invoices?.[0] || null;

  if (!invoice) {
    return {
      data: null,
      error: new Error(
        `Invoice "${lookupValue}" was not found.`
      ),
    };
  }

  if (!invoice.sale_id) {
    return {
      data: mapInvoice(
        invoice,
        null
      ),
      error: null,
    };
  }

  const {
    data: sales,
    error: saleError,
  } = await supabase
    .from("sales")
    .select(`
      id,
      amount_paid,
      balance_due,
      payment_method
    `)
    .eq(
      "id",
      invoice.sale_id
    )
    .limit(1);

  if (saleError) {
    console.error(
      "getInvoiceByNumber sale error:",
      saleError.message,
      saleError.details,
      saleError.hint,
      saleError.code
    );

    return {
      data: null,
      error: new Error(
        saleError.message ||
          "Unable to load linked sale."
      ),
    };
  }

  return {
    data: mapInvoice(
      invoice,
      sales?.[0] || null
    ),
    error: null,
  };
}

/* =========================================================
   GET INVOICE BY UUID OR INVOICE NUMBER
========================================================= */

export async function getInvoiceById(
  value: string
): Promise<{
  data: InvoiceWithSale | null;
  error: Error | null;
}> {
  if (!value?.trim()) {
    return {
      data: null,
      error: new Error(
        "Invoice ID or invoice number is required."
      ),
    };
  }

  const lookupValue =
    value.trim();

  /*
   * UUID validation.
   *
   * This is important because invoices.id
   * is a PostgreSQL UUID column.
   */

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const isUuid =
    uuidRegex.test(
      lookupValue
    );

  console.log(
    "getInvoiceById lookup:",
    {
      value: lookupValue,
      isUuid,
    }
  );

  let invoice: any = null;

  /* =======================================================
     UUID LOOKUP
  ======================================================= */

  if (isUuid) {
    const {
      data,
      error,
    } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        customer_name,
        product_name,
        quantity,
        unit_price,
        total_amount,
        payment_status,
        sale_id,
        created_at
      `)
      .eq(
        "id",
        lookupValue
      )
      .limit(1);

    console.log(
      "Invoice UUID lookup result:",
      {
        lookupValue,
        data,
        count: data?.length ?? 0,
        error,
      }
    );

    if (error) {
      console.error(
        "getInvoiceById UUID error:",
        error.message,
        error.details,
        error.hint,
        error.code
      );

      return {
        data: null,
        error: new Error(
          error.message ||
            "Unable to load invoice."
        ),
      };
    }

    invoice =
      data?.[0] || null;
  }

  /* =======================================================
     INVOICE NUMBER LOOKUP
  ======================================================= */

  else {
    const {
      data,
      error,
    } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        customer_name,
        product_name,
        quantity,
        unit_price,
        total_amount,
        payment_status,
        sale_id,
        created_at
      `)
      .eq(
        "invoice_number",
        lookupValue
      )
      .limit(1);

    console.log(
      "Invoice number lookup result:",
      {
        lookupValue,
        data,
        count: data?.length ?? 0,
        error,
      }
    );

    if (error) {
      console.error(
        "getInvoiceById invoice-number error:",
        error.message,
        error.details,
        error.hint,
        error.code
      );

      return {
        data: null,
        error: new Error(
          error.message ||
            "Unable to load invoice."
        ),
      };
    }

    invoice =
      data?.[0] || null;
  }

  /* =======================================================
     INVOICE NOT FOUND
  ======================================================= */

  if (!invoice) {
    return {
      data: null,
      error: new Error(
        `Invoice "${lookupValue}" was not found.`
      ),
    };
  }

  /* =======================================================
     NO LINKED SALE
  ======================================================= */

  if (!invoice.sale_id) {
    return {
      data: mapInvoice(
        invoice,
        null
      ),
      error: null,
    };
  }

  /* =======================================================
     GET LINKED SALE
  ======================================================= */

  const {
    data: sales,
    error: saleError,
  } = await supabase
    .from("sales")
    .select(`
      id,
      amount_paid,
      balance_due,
      payment_method
    `)
    .eq(
      "id",
      invoice.sale_id
    )
    .limit(1);

  if (saleError) {
    console.error(
      "getInvoiceById sale error:",
      saleError.message,
      saleError.details,
      saleError.hint,
      saleError.code
    );

    return {
      data: null,
      error: new Error(
        saleError.message ||
          "Unable to load linked sale."
      ),
    };
  }

  console.log(
    "Linked sale lookup:",
    {
      saleId: invoice.sale_id,
      sales,
      count: sales?.length ?? 0,
    }
  );

  return {
    data: mapInvoice(
      invoice,
      sales?.[0] || null
    ),
    error: null,
  };
}

/* =========================================================
   GET PAYMENTS FOR SALE
========================================================= */

export async function getInvoicePayments(
  saleId: string
): Promise<{
  data: SalePayment[] | null;
  error: Error | null;
}> {
  if (!saleId?.trim()) {
    return {
      data: [],
      error: null,
    };
  }

  const {
    data,
    error,
  } = await supabase
    .from("sale_payments")
    .select(`
      id,
      sale_id,
      amount,
      payment_method,
      reference,
      notes,
      created_by,
      created_at
    `)
    .eq(
      "sale_id",
      saleId
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getInvoicePayments error:",
      error.message,
      error.details,
      error.hint,
      error.code
    );

    return {
      data: null,
      error: new Error(
        error.message ||
          "Unable to load invoice payments."
      ),
    };
  }

  return {
    data:
      (data || []) as SalePayment[],
    error: null,
  };
}