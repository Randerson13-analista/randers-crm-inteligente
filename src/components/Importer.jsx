import React, { useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ACTIVITY_SEGMENTS,
  RECOVERY_GROUPS,
  canonicalRecoveryGroup,
  canonicalSegment,
  normalizeResellerClassification,
} from '../domain/portfolio';

const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const pick = (row, names) => {
  const columns = Object.keys(row);
  for (const name of names) {
    const key = columns.find(column => normalize(column).includes(name));
    if (key) return row[key];
  }
  return '';
};

function detectClassification(fileName, sheetName, row) {
  const explicitSegment = pick(row, [
    'papel',
    'segmentacao',
    'segmento',
    'nivel',
    'faixa',
    'categoria',
    'atividade',
  ]);
  const segment = canonicalSegment(explicitSegment)
    || canonicalSegment(sheetName)
    || canonicalSegment(fileName);

  const rawBase = [
    fileName,
    sheetName,
    pick(row, ['base', 'grupo', 'carteira', 'situacao', 'status atividade']),
  ].join(' ');
  const recovery = canonicalRecoveryGroup(rawBase);

  if (recovery) {
    return {
      base: recovery,
      nivel: segment || '',
      atividade: segment || '',
    };
  }

  return {
    base: 'Atividade',
    nivel: segment || '',
    atividade: segment || '',
  };
}

function parseWorkbook(file, workbook) {
  const rows = [];
  workbook.SheetNames.forEach(sheetName => {
    const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    sheetRows.forEach((source, index) => {
      const nome = pick(source, ['nome', 'revendedor', 'razao', 'cliente']);
      if (!String(nome).trim()) return;
      const classification = detectClassification(file.name, sheetName, source);
      const phone = pick(source, [
        'telefone movel',
        'celular',
        'whatsapp',
        'telefone residencial',
        'telefone recado',
        'telefone',
        'fone',
      ]);
      const blocked = String(pick(source, ['bloqueado', 'bloqueio'])).trim();
      const inactivity = pick(source, ['ciclosinatividade', 'ciclos inatividade', 'inatividade']);
      rows.push(normalizeResellerClassification({
        codigo: String(pick(source, ['codigo revendedor', 'codigo', 'cod rev', 'id rev'])).trim(),
        nome: String(nome).trim(),
        telefone: String(phone).replace(/\D/g, ''),
        cidade: String(pick(source, ['cidade residencial', 'cidade', 'municipio', 'localidade'])).trim(),
        bairro: String(pick(source, ['bairro'])).trim(),
        bloqueado: normalize(blocked) === 'sim' || normalize(blocked) === 'true',
        ...classification,
        status: 'Pendente',
        metadata: {
          sourceFile: file.name,
          sourceSheet: sheetName,
          sourceRow: index + 2,
          ciclosInatividade: inactivity === '' ? null : Number(inactivity),
          papelOriginal: String(pick(source, ['papel'])).trim(),
          classificationWarning: classification.base === 'Atividade' && !classification.nivel
            ? 'Segmentação da Atividade não identificada'
            : null,
        },
      }));
    });
  });
  return rows;
}

export default function Importer({ onImport, imports = [] }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const processFiles = async files => {
    if (!files.length) return;
    setBusy(true);
    setMessage('');
    setError('');

    try {
      const allRows = [];
      const names = [];
      for (const file of files) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        allRows.push(...parseWorkbook(file, workbook));
        names.push(file.name);
      }

      const result = await onImport(allRows, [{
        name: names.join(', '),
        count: allRows.length,
        date: new Date().toISOString(),
      }]);

      setMessage(
        `${result?.inserted || 0} novos, ${result?.updated || 0} atualizados e ${result?.rejected || 0} rejeitados.`,
      );
      if (input.current) input.current.value = '';
    } catch (exception) {
      setError(`Não foi possível importar: ${exception.message}`);
    } finally {
      setBusy(false);
    }
  };

  return <section className="module-page">
    <div className="import-grid">
      <article
        className="upload-card"
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault();
          processFiles([...event.dataTransfer.files]);
        }}
      >
        <UploadCloud size={44}/>
        <h2>Importar bases</h2>
        <p>Arraste planilhas XLSX/XLS ou selecione os arquivos no computador.</p>
        <button className="primary" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Consolidando dados...' : 'Selecionar planilhas'}
        </button>
        <input
          ref={input}
          hidden
          type="file"
          multiple
          accept=".xlsx,.xls"
          onChange={event => processFiles([...event.target.files])}
        />
        {message && <div className="import-message"><CheckCircle2 size={18}/>{message}</div>}
        {error && <div className="form-error">{error}</div>}
      </article>

      <article className="panel">
        <div className="panel-title"><h2>Classificação corrigida</h2></div>
        <p className="muted-note">
          <b>Atividade</b> é o grupo principal. As segmentações ficam dentro dela.
        </p>
        <ul className="feature-list">
          <li>Atividade: {ACTIVITY_SEGMENTS.join(', ')}</li>
          <li>Recuperação: {RECOVERY_GROUPS.join(', ')}</li>
          <li>Atualização automática de registros já existentes</li>
          <li>Consolidação por código, telefone ou nome + cidade</li>
          <li>Distribuição automática conforme a carteira do colaborador</li>
        </ul>
      </article>
    </div>

    <article className="panel import-history">
      <div className="panel-title"><h2>Histórico de importações</h2><span>{imports.length}</span></div>
      {imports.length ? imports.map(item => <div className="import-row" key={item.id || `${item.name}-${item.date}`}>
        <FileSpreadsheet size={20}/>
        <div>
          <b>{item.name}</b>
          <small>{new Date(item.date).toLocaleString('pt-BR')} · {item.status || 'concluído'}</small>
        </div>
        <strong>{item.inserted || 0} novos · {item.updated || 0} atualizados</strong>
      </div>) : <div className="empty">Nenhuma importação registrada.</div>}
    </article>
  </section>;
}
