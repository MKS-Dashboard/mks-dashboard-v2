import type { DashboardResourceResult } from "../../shared/contracts";
import { DataTable } from "./AccountPages";
import { Failure, read } from "./DashboardPages";
import { parseBuildings, parseEquipments, parseVehicles, vehicleCategories } from "./dashboard-model";
import catalog from "./data/equipments.json";

export function EquipmentsPage({ result, buildingsResult, vehiclesResult, selectedType = null, onShowDetails, onBack }: {
  result: DashboardResourceResult;
  buildingsResult: DashboardResourceResult;
  vehiclesResult: DashboardResourceResult;
  selectedType?: string | null;
  onShowDetails?: (type: string) => void;
  onBack?: () => void;
}) {
  const parsed = read(result, parseEquipments);
  const buildings = read(buildingsResult, parseBuildings);
  const vehicles = read(vehiclesResult, parseVehicles);
  if (!parsed.ok) return <Failure message={parsed.error} />;
  const buildingNames = new Map(buildings.ok ? buildings.value.map((item) => [item.id, item.name]) : []);
  const vehicleNames = new Map(vehicles.ok ? vehicles.value.map((item) => [item.id, item.name]) : []);
  const equipmentName = (type: string) => catalog.find((item) => item.id === type)?.name ?? `Onbekend type (${type})`;
  const vehicleName = (id: number | null) => id === null ? "Niet gekoppeld" : vehicleNames.get(id) || `Voertuig ${id}`;
  const items = selectedType === null ? parsed.value : parsed.value.filter((item) => item.type === selectedType);
  const types = new Map<string, { count: number; loaded: number; assigned: number; size: number }>();
  for (const item of parsed.value) {
    const row = types.get(item.type) ?? { count: 0, loaded: 0, assigned: 0, size: 0 };
    row.count++;
    row.loaded += item.vehicleId === null ? 0 : 1;
    row.assigned += item.assignedVehicleId === null ? 0 : 1;
    row.size += item.size;
    types.set(item.type, row);
  }
  const categoryNames = [...new Set([...types.keys()].flatMap((type) => {
    const categories = catalog.find((entry) => entry.id === type)?.categories ?? [];
    return categories.length ? categories : ["Overige"];
  }))];
  const categories = categoryNames.map((category) => ({
    category,
    name: vehicleCategories.find((entry) => entry.category === category)?.name ?? category,
    tone: vehicleCategories.find((entry) => entry.category === category)?.tone ?? "",
    types: [...types].filter(([type]) => {
      const assigned = catalog.find((entry) => entry.id === type)?.categories ?? [];
      return assigned.length ? assigned.includes(category) : category === "Overige";
    }),
  }));
  return (
    <div className="report-page">
      <div className="section-heading">
        <div>
          <h2>{selectedType === null ? `Je hebt ${items.length.toLocaleString("nl-NL")} equipmentitems in totaal.` : equipmentName(selectedType)}</h2>
          {selectedType !== null && <p>Je hebt {items.length.toLocaleString("nl-NL")} equipmentitems van dit type.</p>}
          <p>Aantallen per type, opslaglocaties en voertuigkoppelingen. Grootte is de capaciteit die equipment inneemt.</p>
        </div>
        {selectedType !== null && onBack && <button className="back-button" onClick={onBack}>Terug naar overzicht</button>}
      </div>
      {selectedType === null && categories.map((category) => <div className="report-category" key={category.category}>
        <DataTable title={`${category.name} (${category.types.reduce((sum, [, row]) => sum + row.count, 0).toLocaleString("nl-NL")})`}
          tone={category.tone}
          headers={["Type", "Aantal", "In voertuig", "Toegewezen aan voertuig", "Totale grootte"]}
          rows={category.types.map(([type, row]) => ({
            cells: [equipmentName(type), row.count, row.loaded, row.assigned, row.size],
            onDetails: onShowDetails ? () => onShowDetails(type) : undefined,
          }))} />
      </div>)}
      {selectedType === null && categories.length === 0 && <div className="empty-state">Geen equipment gevonden.</div>}
      {selectedType !== null && <>
      {!buildings.ok && <Failure message={`Gebouwlocaties konden niet worden geladen: ${buildings.error}`} />}
      {!vehicles.ok && <Failure message={`Voertuignamen konden niet worden geladen: ${vehicles.error}`} />}
      <DataTable title="Equipmentitems"
        headers={["ID", "Naam", "Type", "Gebouw", "In voertuig", "Toegewezen voertuig", "Grootte"]}
        rows={items.map((item) => ({
          cells: [item.id, item.name || equipmentName(item.type), equipmentName(item.type),
            buildingNames.get(item.buildingId) || `Gebouw ${item.buildingId}`,
            vehicleName(item.vehicleId), vehicleName(item.assignedVehicleId), item.size],
        }))} />
      </>}
    </div>
  );
}
