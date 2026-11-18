"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { importarDatos, type ImportRow } from "@/lib/actions/import-data";
import { markLocalMutation } from "@/lib/realtime/local-mutation";

const SIN_COLUMNA = "__ninguna__";

type Fila = Record<string, unknown>;

function detectar(headers: string[], patron: RegExp): string {
  return headers.find((h) => patron.test(h)) ?? SIN_COLUMNA;
}

export function ImportSheet() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [colCliente, setColCliente] = useState(SIN_COLUMNA);
  const [colVideo, setColVideo] = useState(SIN_COLUMNA);
  const [colInicio, setColInicio] = useState(SIN_COLUMNA);
  const [colEntrega, setColEntrega] = useState(SIN_COLUMNA);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setHeaders([]);
    setFilas([]);
    setNombreArchivo("");
    setColCliente(SIN_COLUMNA);
    setColVideo(SIN_COLUMNA);
    setColInicio(SIN_COLUMNA);
    setColEntrega(SIN_COLUMNA);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Fila>(ws, { defval: "" });
        if (json.length === 0) {
          toast.error("El archivo está vacío.");
          return;
        }
        const hs = Object.keys(json[0]);
        setHeaders(hs);
        setFilas(json);
        setColCliente(detectar(hs, /cliente|client|marca|nombre/i));
        setColVideo(detectar(hs, /video|t[ií]tulo|titulo|contenido|pieza/i));
        setColInicio(detectar(hs, /inicio|start|comienzo/i));
        setColEntrega(detectar(hs, /entrega|due|deadline|l[ií]mite|fin/i));
      } catch {
        toast.error("No se pudo leer el archivo. Debe ser .xlsx, .xls o .csv.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const filasValidas = colCliente !== SIN_COLUMNA
    ? filas.filter((f) => String(f[colCliente] ?? "").trim())
    : [];
  const clientesDistintos = new Set(
    filasValidas.map((f) => String(f[colCliente]).trim().toLowerCase()),
  ).size;
  const videosContados =
    colVideo !== SIN_COLUMNA ? filasValidas.filter((f) => String(f[colVideo] ?? "").trim()).length : 0;

  function handleImportar() {
    if (colCliente === SIN_COLUMNA) {
      toast.error("Elige qué columna tiene el nombre del cliente.");
      return;
    }
    const rows: ImportRow[] = filasValidas.map((f) => ({
      cliente: String(f[colCliente]).trim(),
      video: colVideo !== SIN_COLUMNA ? String(f[colVideo] ?? "").trim() : undefined,
      inicio: colInicio !== SIN_COLUMNA ? String(f[colInicio] ?? "") : null,
      entrega: colEntrega !== SIN_COLUMNA ? String(f[colEntrega] ?? "") : null,
    }));

    startTransition(async () => {
      const result = await importarDatos(rows);
      if (result.ok) {
        markLocalMutation();
        toast.success(
          `Importado: ${result.clientesCreados} cliente(s) nuevo(s), ${result.videosCreados} video(s).`,
        );
        setOpen(false);
        reset();
      } else {
        toast.error(result.error);
      }
    });
  }

  function ColumnaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_COLUMNA}>— Ninguna —</SelectItem>
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Importar desde Sheet/Excel
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar clientes y videos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sube tu Google Sheet (exportado a Excel/CSV) o un archivo de Excel. La app crea los
              clientes y registra sus videos en el mes abierto, en automático.
            </p>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFile}
              />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" />
                {nombreArchivo || "Elegir archivo (.xlsx, .xls, .csv)"}
              </Button>
            </div>

            {headers.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground">Mapea las columnas:</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cliente *</Label>
                    <ColumnaSelect value={colCliente} onChange={setColCliente} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Video (título)</Label>
                    <ColumnaSelect value={colVideo} onChange={setColVideo} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha inicio</Label>
                    <ColumnaSelect value={colInicio} onChange={setColInicio} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha entrega</Label>
                    <ColumnaSelect value={colEntrega} onChange={setColEntrega} />
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  Se importarán <span className="font-semibold text-foreground">{clientesDistintos}</span>{" "}
                  cliente(s) y <span className="font-semibold text-foreground">{videosContados}</span>{" "}
                  video(s).
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleImportar}
              disabled={isPending || headers.length === 0 || colCliente === SIN_COLUMNA}
            >
              {isPending ? "Importando…" : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
