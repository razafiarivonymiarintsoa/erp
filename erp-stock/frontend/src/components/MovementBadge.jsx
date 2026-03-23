import { ArrowDownCircle, ArrowUpCircle, ArrowRightLeft } from 'lucide-react';

const CONFIG = {
  ENTREE:            { label: 'Entrée',             cls: 'badge-green',  Icon: ArrowDownCircle  },
  SORTIE:            { label: 'Sortie',             cls: 'badge-red',    Icon: ArrowUpCircle    },
  TRANSFERT_ENTRANT: { label: 'Transfert entrant',  cls: 'badge-blue',   Icon: ArrowRightLeft   },
  TRANSFERT_SORTANT: { label: 'Transfert sortant',  cls: 'badge-yellow', Icon: ArrowRightLeft   },
};

export default function MovementBadge({ type }) {
  const cfg = CONFIG[type] || { label: type, cls: 'badge-blue', Icon: ArrowRightLeft };
  const { label, cls, Icon } = cfg;
  return (
    <span className={`badge ${cls}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}
