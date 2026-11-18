import { useState, useEffect, useRef } from 'react';
import { createClient, isSupabaseConfigured } from './lib/supabase/client';

const TABLE_NAMES = [
  'employees',
  'attendance',
  'employee_loans',
  'employee_production',
  'payroll',
  'raw_materials',
  'expenses',
  'customers',
  'quotations',
  'quotation_items',
  'sales_orders',
  'sales_items',
  'work_orders',
  'suppliers',
  'purchase_orders',
  'purchase_items',
  'users',
  'shipping_orders',
  'owner_withdrawals',
  'stock_movements',
  'payment_vouchers',
];

const DB_CHANGE_EVENT = 'jin-engine-db-changed';

function notifyDbChange(tableName) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { detail: { tableName } }));
  }
}

// In-memory fallback store used only when Supabase env vars are not configured yet
// (e.g. during build-time prerendering or unconfigured demo preview).
const memoryStore = Object.fromEntries(TABLE_NAMES.map((name) => [name, []]));

class SupabaseTable {
  constructor(name) {
    this.name = name;
  }

  _client() {
    return createClient();
  }

  async toArray() {
    const supabase = this._client();
    if (!supabase) {
      return [...(memoryStore[this.name] || [])];
    }
    const { data, error } = await supabase.from(this.name).select('*');
    if (error) {
      console.error(`[Supabase:${this.name}] select error:`, error.message);
      return [];
    }
    return data || [];
  }

  filter(predicate) {
    const self = this;
    return {
      async toArray() {
        const rows = await self.toArray();
        return rows.filter(predicate);
      },
      async first() {
        const rows = await self.toArray();
        return rows.find(predicate);
      },
    };
  }

  where(column) {
    const self = this;
    return {
      equals(value) {
        const fetchMatching = async () => {
          const supabase = self._client();
          if (!supabase) {
            return (memoryStore[self.name] || []).filter((r) => r?.[column] === value);
          }
          const { data, error } = await supabase
            .from(self.name)
            .select('*')
            .eq(column, value);
          if (error) {
            console.error(`[Supabase:${self.name}] where(${column}) error:`, error.message);
            return [];
          }
          return data || [];
        };

        return {
          async toArray() {
            return fetchMatching();
          },
          async first() {
            const rows = await fetchMatching();
            return rows[0];
          },
          filter(predicate) {
            return {
              async toArray() {
                const rows = await fetchMatching();
                return rows.filter(predicate);
              },
              async first() {
                const rows = await fetchMatching();
                return rows.find(predicate);
              },
            };
          },
          async modify(updater) {
            const rows = await fetchMatching();
            for (const row of rows) {
              const patch = typeof updater === 'function' ? (() => {
                const copy = { ...row };
                updater(copy);
                return copy;
              })() : updater;
              if (row.id !== undefined) {
                await self.update(row.id, patch);
              }
            }
            return rows.length;
          },
        };
      },
    };
  }

  async get(id) {
    if (id === undefined || id === null) return undefined;
    const supabase = this._client();
    if (!supabase) {
      return (memoryStore[this.name] || []).find((r) => r.id === id);
    }
    const { data, error } = await supabase
      .from(this.name)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error(`[Supabase:${this.name}] get(${id}) error:`, error.message);
      return undefined;
    }
    return data ?? undefined;
  }

  async add(record) {
    const payload = {
      ...record,
      id: record.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    };
    const supabase = this._client();
    if (!supabase) {
      memoryStore[this.name] = [...(memoryStore[this.name] || []), payload];
      notifyDbChange(this.name);
      return payload.id;
    }
    const { data, error } = await supabase
      .from(this.name)
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      console.error(`[Supabase:${this.name}] add error:`, error.message);
      throw error;
    }
    notifyDbChange(this.name);
    return data?.id ?? payload.id;
  }

  async put(record) {
    const payload = {
      ...record,
      id: record.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    };
    const supabase = this._client();
    if (!supabase) {
      const list = memoryStore[this.name] || [];
      const idx = list.findIndex((r) => r.id === payload.id);
      if (idx >= 0) {
        list[idx] = payload;
      } else {
        list.push(payload);
      }
      memoryStore[this.name] = [...list];
      notifyDbChange(this.name);
      return payload.id;
    }
    const { data, error } = await supabase
      .from(this.name)
      .upsert(payload)
      .select('id')
      .single();
    if (error) {
      console.error(`[Supabase:${this.name}] put error:`, error.message);
      throw error;
    }
    notifyDbChange(this.name);
    return data?.id ?? payload.id;
  }

  async update(id, patch) {
    const supabase = this._client();
    if (!supabase) {
      const list = memoryStore[this.name] || [];
      const idx = list.findIndex((r) => r.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...patch };
        memoryStore[this.name] = [...list];
        notifyDbChange(this.name);
        return 1;
      }
      return 0;
    }
    const { error } = await supabase
      .from(this.name)
      .update(patch)
      .eq('id', id);
    if (error) {
      console.error(`[Supabase:${this.name}] update(${id}) error:`, error.message);
      throw error;
    }
    notifyDbChange(this.name);
    return 1;
  }

  async delete(id) {
    const supabase = this._client();
    if (!supabase) {
      memoryStore[this.name] = (memoryStore[this.name] || []).filter((r) => r.id !== id);
      notifyDbChange(this.name);
      return;
    }
    const { error } = await supabase
      .from(this.name)
      .delete()
      .eq('id', id);
    if (error) {
      console.error(`[Supabase:${this.name}] delete(${id}) error:`, error.message);
      throw error;
    }
    notifyDbChange(this.name);
  }

  async clear() {
    const supabase = this._client();
    if (!supabase) {
      memoryStore[this.name] = [];
      notifyDbChange(this.name);
      return;
    }
    const { error } = await supabase
      .from(this.name)
      .delete()
      .neq('id', '');
    if (error) {
      console.error(`[Supabase:${this.name}] clear error:`, error.message);
      throw error;
    }
    notifyDbChange(this.name);
  }

  async bulkAdd(records) {
    if (!Array.isArray(records) || records.length === 0) return [];
    const supabase = this._client();
    if (!supabase) {
      memoryStore[this.name] = [...(memoryStore[this.name] || []), ...records];
      notifyDbChange(this.name);
      return records.map((r) => r.id);
    }
    const { error } = await supabase.from(this.name).insert(records);
    if (error) {
      console.error(`[Supabase:${this.name}] bulkAdd error:`, error.message);
      throw error;
    }
    notifyDbChange(this.name);
    return records.map((r) => r.id);
  }

  async bulkPut(records) {
    if (!Array.isArray(records) || records.length === 0) return [];
    const supabase = this._client();
    if (!supabase) {
      for (const rec of records) {
        await this.put(rec);
      }
      return records.map((r) => r.id);
    }
    const { error } = await supabase.from(this.name).upsert(records);
    if (error) {
      console.error(`[Supabase:${this.name}] bulkPut error:`, error.message);
      throw error;
    }
    notifyDbChange(this.name);
    return records.map((r) => r.id);
  }

  async count() {
    const supabase = this._client();
    if (!supabase) {
      return (memoryStore[this.name] || []).length;
    }
    const { count, error } = await supabase
      .from(this.name)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`[Supabase:${this.name}] count error:`, error.message);
      return 0;
    }
    return count || 0;
  }
}

const tableInstances = Object.fromEntries(
  TABLE_NAMES.map((name) => [name, new SupabaseTable(name)])
);

export const db = {
  ...tableInstances,
  tables: Object.values(tableInstances),
  table(name) {
    return tableInstances[name];
  },
  async transaction(_mode, _tables, callback) {
    return callback();
  },
  isConfigured: isSupabaseConfigured,
};

/**
 * Drop-in replacement for dexie-react-hooks' useLiveQuery backed by Supabase queries
 * and reactive change notifications.
 */
export function useLiveQuery(querier, deps = [], defaultValue = undefined) {
  const [data, setData] = useState(defaultValue);
  const querierRef = useRef(querier);

  useEffect(() => {
    querierRef.current = querier;
  }, [querier]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const result = await querierRef.current();
        if (active) {
          setData(result);
        }
      } catch (err) {
        console.error('[useLiveQuery] query failed:', err);
      }
    };

    run();

    const handleChange = () => {
      run();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(DB_CHANGE_EVENT, handleChange);
    }

    return () => {
      active = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener(DB_CHANGE_EVENT, handleChange);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}
