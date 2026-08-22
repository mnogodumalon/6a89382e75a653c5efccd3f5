import type { Leihvorgaenge, Leihraeder, Kunden } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { t, appLabel, fieldLabel, lookupLabel, dateFnsLocale, dateFormat } from '@/i18n';
import { format, parseISO } from 'date-fns';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), dateFormat(), { locale: dateFnsLocale() }); } catch { return d; }
}

interface LeihvorgaengeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Leihvorgaenge | null;
  onEdit: (record: Leihvorgaenge) => void;
  leihraederList: Leihraeder[];
  kundenList: Kunden[];
}

export function LeihvorgaengeViewDialog({ open, onClose, record, onEdit, leihraederList, kundenList }: LeihvorgaengeViewDialogProps) {
  function getLeihraederDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return leihraederList.find(r => r.record_id === id)?.fields.rahmennummer ?? '—';
  }

  function getKundenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kundenList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_entity', { entity: appLabel('leihvorgaenge') })}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            {t('edit_button')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leihvorgaenge', 'leihrad')}</Label>
            <p className="text-sm">{getLeihraederDisplayName(record.fields.leihrad)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leihvorgaenge', 'kunde')}</Label>
            <p className="text-sm">{getKundenDisplayName(record.fields.kunde)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leihvorgaenge', 'startdatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.startdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leihvorgaenge', 'enddatum')}</Label>
            <p className="text-sm">{formatDate(record.fields.enddatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leihvorgaenge', 'bild_vorher')}</Label>
            {record.fields.bild_vorher ? (
              <MediaThumbnail src={record.fields.bild_vorher} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leihvorgaenge', 'zustand_vorher')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.zustand_vorher ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leihvorgaenge', 'bild_nachher')}</Label>
            {record.fields.bild_nachher ? (
              <MediaThumbnail src={record.fields.bild_nachher} fit="contain" className="w-full rounded-lg border" />
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leihvorgaenge', 'zustand_nachher')}</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.zustand_nachher ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{fieldLabel('leihvorgaenge', 'status')}</Label>
            <Badge variant="secondary">{lookupLabel('leihvorgaenge', 'status', record.fields.status?.key) ?? record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.LEIHVORGAENGE} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}