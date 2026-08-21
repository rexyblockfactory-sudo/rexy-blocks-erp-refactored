import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{
    productId: string;
  }>;
}

interface UpdateProductRequest {
  price?: number;
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const supabase =
      await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const { data: adminProfile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Admin profile lookup failed:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify administrator access.",
        },
        { status: 500 }
      );
    }

    if (adminProfile?.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Administrator access required.",
        },
        { status: 403 }
      );
    }

    const { productId } = await context.params;

    if (!productId) {
      return NextResponse.json(
        {
          error: "Product ID is required.",
        },
        { status: 400 }
      );
    }

    const body =
      (await request.json()) as UpdateProductRequest;

    const price = Number(body.price);

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Price must be a valid number greater than zero.",
        },
        { status: 400 }
      );
    }

    const { data: product, error: productError } =
      await supabaseAdmin
        .from("products")
        .update({
          price,
        })
        .eq("id", productId)
        .select()
        .maybeSingle();

    if (productError) {
      console.error(
        "Product price update failed:",
        productError
      );

      return NextResponse.json(
        {
          error:
            `Failed to update product price: ${productError.message}`,
        },
        { status: 500 }
      );
    }

    if (!product) {
      return NextResponse.json(
        {
          error: "Product not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
      message:
        "Product price updated successfully.",
    });
  } catch (error) {
    console.error(
      "Product update route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}