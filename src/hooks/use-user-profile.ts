"use client";

import { useEffect, useState } from "react";
import {
  getCurrentUserProfile,
  type UserProfile,
} from "@/services/users";

export function useUserProfile() {
  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data, error } =
        await getCurrentUserProfile();

      if (!active) {
        return;
      }

      if (error) {
        setError(error.message);
      } else {
        setProfile(data);
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  return {
    profile,
    loading,
    error,
  };
}