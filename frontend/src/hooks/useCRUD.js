import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

/**
 * Hook generico per operazioni CRUD su un endpoint REST.
 *
 * @param {string} endpoint - Percorso base (es. "/clients")
 * @param {object} options
 * @param {string} [options.idField="id"] - Campo usato come identificatore
 * @param {string} [options.successCreate] - Messaggio toast dopo creazione
 * @param {string} [options.successUpdate] - Messaggio toast dopo aggiornamento
 * @param {string} [options.successDelete] - Messaggio toast dopo eliminazione
 */
export function useCRUD(endpoint, options = {}) {
  const {
    idField = 'id',
    successCreate = 'Creato con successo',
    successUpdate = 'Aggiornato con successo',
    successDelete = 'Eliminato con successo',
  } = options;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get(endpoint, { params });
      setItems(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Errore nel caricamento';
      toast.error(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const create = useCallback(async (data) => {
    setSaving(true);
    try {
      const res = await api.post(endpoint, data);
      setItems((prev) => [...prev, res.data]);
      toast.success(successCreate);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Errore durante la creazione';
      toast.error(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [endpoint, successCreate]);

  const update = useCallback(async (id, data) => {
    setSaving(true);
    try {
      const res = await api.put(`${endpoint}/${id}`, data);
      setItems((prev) => prev.map((item) => (item[idField] === id ? res.data : item)));
      toast.success(successUpdate);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Errore durante l\'aggiornamento';
      toast.error(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [endpoint, idField, successUpdate]);

  const remove = useCallback(async (id) => {
    setSaving(true);
    try {
      await api.delete(`${endpoint}/${id}`);
      setItems((prev) => prev.filter((item) => item[idField] !== id));
      toast.success(successDelete);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Errore durante l\'eliminazione';
      toast.error(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [endpoint, idField, successDelete]);

  return { items, setItems, loading, saving, fetchAll, create, update, remove };
}
