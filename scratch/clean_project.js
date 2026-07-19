import fs from 'fs';
import path from 'path';

const projectPath = path.resolve('temp/project.json');

function cleanProject() {
  if (!fs.existsSync(projectPath)) {
    console.error(`Project file not found at: ${projectPath}`);
    return;
  }

  console.log(`Reading project from: ${projectPath}`);
  const data = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

  let cleanedExposedTemplatesCount = 0;
  let cleanedExposedCardsCount = 0;
  let cleanedValuesCount = 0;
  let cleanedOverridesCount = 0;

  // Helper to clean exposedProperties based on valid layers list
  function cleanExposedList(exposedProperties, capas) {
    if (!Array.isArray(exposedProperties) || !Array.isArray(capas)) return exposedProperties;
    const layerIds = new Set(capas.map(c => c.id));
    const initialLen = exposedProperties.length;
    const filtered = exposedProperties.filter(p => layerIds.has(p.layerId));
    cleanedExposedTemplatesCount += (initialLen - filtered.length);
    return filtered;
  }

  // Clean root templates
  if (data.templates) {
    for (const [tplId, tpl] of Object.entries(data.templates)) {
      if (tpl && Array.isArray(tpl.capas)) {
        if (tpl.exposedProperties) {
          tpl.exposedProperties = cleanExposedList(tpl.exposedProperties, tpl.capas);
        }
      }
    }
  }

  // Clean documents
  const documentos = data.documentos || [];
  for (const doc of documentos) {
    const cards = doc.cards || [];
    for (const card of cards) {
      // Find valid front layers
      let frontCapas = [];
      if (card.plantilla && Array.isArray(card.plantilla.capas)) {
        frontCapas = card.plantilla.capas;
        if (card.plantilla.exposedProperties) {
          card.plantilla.exposedProperties = cleanExposedList(card.plantilla.exposedProperties, frontCapas);
        }
      } else if (card.plantillaId && data.templates && data.templates[card.plantillaId]) {
        frontCapas = data.templates[card.plantillaId].capas || [];
      }
      const frontLayerIds = new Set(frontCapas.map(c => c.id));

      // Find valid back layers
      let backCapas = [];
      if (card.plantillaTrasera && Array.isArray(card.plantillaTrasera.capas)) {
        backCapas = card.plantillaTrasera.capas;
        if (card.plantillaTrasera.exposedProperties) {
          card.plantillaTrasera.exposedProperties = cleanExposedList(card.plantillaTrasera.exposedProperties, backCapas);
        }
      } else if (card.plantillaTraseraId && data.templates && data.templates[card.plantillaTraseraId]) {
        backCapas = data.templates[card.plantillaTraseraId].capas || [];
      }
      const backLayerIds = new Set(backCapas.map(c => c.id));

      // Clean card root exposedProperties
      if (Array.isArray(card.exposedProperties)) {
        const initialLen = card.exposedProperties.length;
        card.exposedProperties = card.exposedProperties.filter(p => frontLayerIds.has(p.layerId) || backLayerIds.has(p.layerId));
        cleanedExposedCardsCount += (initialLen - card.exposedProperties.length);
      }

      // Clean front values
      if (card.valoresCampos) {
        for (const key of Object.keys(card.valoresCampos)) {
          if (!frontLayerIds.has(key)) {
            delete card.valoresCampos[key];
            cleanedValuesCount++;
          }
        }
      }

      // Clean back values
      if (card.valoresCamposTrasera) {
        for (const key of Object.keys(card.valoresCamposTrasera)) {
          if (!backLayerIds.has(key)) {
            delete card.valoresCamposTrasera[key];
            cleanedValuesCount++;
          }
        }
      }

      // Clean front overrides
      if (card.capasOverrides) {
        for (const key of Object.keys(card.capasOverrides)) {
          if (!frontLayerIds.has(key)) {
            delete card.capasOverrides[key];
            cleanedOverridesCount++;
          }
        }
      }

      // Clean back overrides
      if (card.capasOverridesTrasera) {
        for (const key of Object.keys(card.capasOverridesTrasera)) {
          if (!backLayerIds.has(key)) {
            delete card.capasOverridesTrasera[key];
            cleanedOverridesCount++;
          }
        }
      }
    }
  }

  fs.writeFileSync(projectPath, JSON.stringify(data, null, 2), 'utf8');

  console.log('--- CLEANUP COMPLETE ---');
  console.log(`Exposed properties cleaned (templates): ${cleanedExposedTemplatesCount}`);
  console.log(`Exposed properties cleaned (cards): ${cleanedExposedCardsCount}`);
  console.log(`Values cleaned (valoresCampos): ${cleanedValuesCount}`);
  console.log(`Layer overrides cleaned (capasOverrides): ${cleanedOverridesCount}`);
}

cleanProject();
