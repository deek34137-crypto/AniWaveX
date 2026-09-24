import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;
    const presetId = formData.get("presetId") as string | null;

    // Case 1: Switching to a preset avatar ID (e.g. avatar_01)
    if (presetId) {
      const cleanPreset = presetId.trim();
      await Promise.all([
        supabase.from("profiles").upsert({
          id: user.id,
          avatar_id: cleanPreset,
          custom_avatar_url: null,
          updated_at: new Date().toISOString(),
        }),
        supabase.auth.updateUser({
          data: { avatar_id: cleanPreset, custom_avatar_url: null },
        }),
      ]);

      return NextResponse.json({
        success: true,
        avatar_id: cleanPreset,
        custom_avatar_url: null,
      });
    }

    // Case 2: Custom image file upload
    if (!file) {
      return NextResponse.json({ error: "No avatar image provided." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed formats: JPEG, PNG, WebP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { error: "Image size exceeds 2MB limit. Please choose a smaller image." },
        { status: 400 }
      );
    }

    const fileExt = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // Save URL to profiles and auth metadata
    await Promise.all([
      supabase.from("profiles").upsert({
        id: user.id,
        custom_avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      }),
      supabase.auth.updateUser({
        data: { custom_avatar_url: publicUrl },
      }),
    ]);

    return NextResponse.json({
      success: true,
      custom_avatar_url: publicUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process avatar" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reset avatar in database and user metadata
    await Promise.all([
      supabase.from("profiles").upsert({
        id: user.id,
        avatar_id: "avatar_01",
        custom_avatar_url: null,
        updated_at: new Date().toISOString(),
      }),
      supabase.auth.updateUser({
        data: { avatar_id: "avatar_01", custom_avatar_url: null },
      }),
    ]);

    return NextResponse.json({
      success: true,
      avatar_id: "avatar_01",
      custom_avatar_url: null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to remove avatar" }, { status: 500 });
  }
}
