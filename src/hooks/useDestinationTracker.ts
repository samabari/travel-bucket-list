import { useCallback, useEffect, useState } from "react";
import {
  createDestination as createDestinationRecord,
  deleteDestination as deleteDestinationRecord,
  getDestinationErrorMessage,
  listCountries,
  listDestinations,
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

  useEffect(() => {
    void reload();
  }, [reload]);

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

  const remove = useCallback(async (id: string) => {
    try {
      await deleteDestinationRecord(id);
      await reload();
    } catch (cause) {
      throw new Error(getDestinationErrorMessage(cause));
    }
  }, [reload]);

  return { countries, destinations, loading, error, reload, create, update, remove };
}
