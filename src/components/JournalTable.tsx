import type { JournalLine } from '../cards/types.ts';

const amount = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** A journal entry as accountants write it: debits first, credited accounts indented, and the totals. */
export function JournalTable({ lines }: { lines: JournalLine[] }) {
  const debit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const credit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  return (
    <div className="journal-wrap">
      <table className="journal">
        <thead>
          <tr>
            <th scope="col">Compte</th>
            <th scope="col">Intitulé</th>
            <th scope="col" className="num">Débit</th>
            <th scope="col" className="num">Crédit</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className={l.credit !== undefined ? 'cr' : 'dr'}>
              <td className="acct">{l.compte}</td>
              <td>{l.intitule}</td>
              <td className="num">{l.debit !== undefined ? amount.format(l.debit) : ''}</td>
              <td className="num">{l.credit !== undefined ? amount.format(l.credit) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>Total</td>
            <td className="num">{amount.format(debit)}</td>
            <td className="num">{amount.format(credit)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
