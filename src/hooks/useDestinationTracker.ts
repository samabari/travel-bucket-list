import { useCallback, useEffect, useState } from "react";
import {
  addStar,
  createDestination as createDestinationRecord,
  deleteDestination as deleteDestinationRecord,
  getDestinationErrorMessage,
  getStarErrorMessage,
  listStarredDestinationIds,
  listCountries,
  listDestinations,
  removeStar,
  updateDestinationNotes as updateDestinationNotesRecord,
  updateDestination as updateDestinationRecord,
  type Country,
  type Destination,
  type DestinationInput,
} from "../lib/destinations";

export function useDestinationTracker() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starredDestinationIds, setStarredDestinationIds] = useState<Set<string>>(() => new Set());
  const [starsLoading, setStarsLoading] = useState(true);
  const [starsError, setStarsError] = useState("");
  const [pendingStarIds, setPendingStarIds] = useState<Set<string>>(() => new Set());

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextCountries, nextDestinations] = await Promise.all([
        listCountries(),
        listDestinations(),
      ]);
      setCountries(nextCountries);
      setDestinations(nextDestinations);
    } catch (cause) {
      setError(getDestinationErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadStars = useCallback(async () => {
    setStarsLoading(true);
    setStarsError("");
    try {
      const ids = await listStarredDestinationIds();
      setStarredDestinationIds(new Set(ids));
    } catch (cause) {
      setStarsError(getStarErrorMessage(cause));
    } finally {
      setStarsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    void reloadStars();
  }, [reload, reloadStars]);

  const create = useCallback(async (input: DestinationInput) => {
    try {
      await createDestinationRecord(input);
      await reload();
    } catch (cause) {
      throw new Error(getDestinationErrorMessage(cause));
    }
  }, [reload]);

  const update = useCallback(async (id: string, input: DestinationInput) => {
    try {
      await updateDestinationRecord(id, input);
      await reload();
    } catch (cause) {
      throw new Error(getDestinationErrorMessage(cause));
    }
  }, [reload]);

  const saveNotes = useCallback(async (id: string, notes: string) => {
    try {
      await updateDestinationNotesRecord(id, notes);
      await reload();
    } catch (cause) {
      throw new Error(getDestinationErrorMessage(cause));
    }
  }, [reload]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteDestinationRecord(id);
      await reload();
      await reloadStars();
    } catch (cause) {
      throw new Error(getDestinationErrorMessage(cause));
    }
  }, [reload, reloadStars]);

  const toggleStar = useCallback(async (destinationId: string) => {
    if (pendingStarIds.has(destinationId) || starsLoading || starsError) return;
    const wasStarred = starredDestinationIds.has(destinationId);
    setPendingStarIds((current) => new Set(current).add(destinationId));
    setStarsError("");
    try {
      if (wasStarred) {
        await removeStar(destinationId);
        setStarredDestinationIds((current) => {
          const next = new Set(current);
          next.delete(destinationId);
          return next;
        });
      } else {
        await addStar(destinationId);
        setStarredDestinationIds((current) => new Set(current).add(destinationId));
      }
    } catch (cause) {
      setStarsError(getStarErrorMessage(cause));
    } finally {
      setPendingStarIds((current) => {
        const next = new Set(current);
        next.delete(destinationId);
        return next;
      });
    }
  }, [pendingStarIds, starredDestinationIds, starsError, starsLoading]);

  return {
    countries,
    destinations,
    loading,
    error,
    reload,
    create,
    update,
    saveNotes,
    remove,
    starredDestinationIds,
    starsLoading,
    starsError,
    pendingStarIds,
    reloadStars,
    toggleStar,
  };
}
