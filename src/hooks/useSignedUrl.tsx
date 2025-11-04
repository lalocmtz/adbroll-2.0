import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para generar signed URLs temporales de archivos en buckets privados de Supabase
 * Las signed URLs expiran después de 1 hora (3600 segundos)
 */
export function useSignedUrl(storagePath: string | null, bucketName: string = "broll") {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const generateSignedUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: signError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(storagePath, 3600); // 1 hora de validez

        if (signError) throw signError;

        if (isMounted && data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        }
      } catch (err: any) {
        console.error("Error generating signed URL:", err);
        if (isMounted) {
          setError(err.message || "Error al generar URL firmada");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    generateSignedUrl();

    // Refresh signed URL cada 50 minutos (antes de que expire)
    const refreshInterval = setInterval(generateSignedUrl, 50 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, [storagePath, bucketName]);

  return { signedUrl, loading, error };
}
