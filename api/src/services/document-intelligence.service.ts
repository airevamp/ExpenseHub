import { DocumentAnalysisClient, AzureKeyCredential, AnalyzedDocument } from '@azure/ai-form-recognizer';

const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT || '';
const apiKey = process.env.DOCUMENT_INTELLIGENCE_KEY || '';

let client: DocumentAnalysisClient | null = null;

export function getDocumentIntelligenceClient(): DocumentAnalysisClient {
  if (!client) {
    client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
  }
  return client;
}

export interface ReceiptOcrResult {
  merchantName?: string;
  transactionDate?: Date;
  totalAmount?: number;
  currency?: string;
  items?: ReceiptItem[];
  rawText?: string;
}

export interface ReceiptItem {
  description?: string;
  quantity?: number;
  price?: number;
}

function getFieldValue(document: AnalyzedDocument, fieldName: string): unknown {
  const field = document.fields[fieldName];
  if (!field) return undefined;

  // Handle different field types
  if ('value' in field) {
    return (field as { value?: unknown }).value;
  }
  if ('content' in field) {
    return (field as { content?: string }).content;
  }
  return undefined;
}

export async function analyzeReceipt(blobUrl: string): Promise<ReceiptOcrResult> {
  const diClient = getDocumentIntelligenceClient();

  const poller = await diClient.beginAnalyzeDocumentFromUrl('prebuilt-receipt', blobUrl);
  const result = await poller.pollUntilDone();

  if (!result.documents || result.documents.length === 0) {
    return { rawText: result.content };
  }

  const receipt = result.documents[0];

  const ocrResult: ReceiptOcrResult = {
    rawText: result.content
  };

  // Extract merchant name
  const merchantName = getFieldValue(receipt, 'MerchantName');
  if (merchantName) {
    ocrResult.merchantName = String(merchantName);
  }

  // Extract transaction date
  const transactionDate = getFieldValue(receipt, 'TransactionDate');
  if (transactionDate) {
    ocrResult.transactionDate = transactionDate instanceof Date ? transactionDate : new Date(String(transactionDate));
  }

  // Extract total amount
  const total = getFieldValue(receipt, 'Total');
  if (total && typeof total === 'object') {
    const totalObj = total as { amount?: number; currencyCode?: string };
    ocrResult.totalAmount = totalObj.amount;
    ocrResult.currency = totalObj.currencyCode;
  } else if (typeof total === 'number') {
    ocrResult.totalAmount = total;
  }

  // Extract line items (simplified - items extraction can be complex)
  const items = receipt.fields['Items'];
  if (items && 'values' in items) {
    const itemsArray = (items as { values?: unknown[] }).values;
    if (Array.isArray(itemsArray)) {
      ocrResult.items = itemsArray.map((item) => {
        const itemObj = item as { properties?: Record<string, { value?: unknown }> };
        return {
          description: itemObj.properties?.Description?.value as string | undefined,
          quantity: itemObj.properties?.Quantity?.value as number | undefined,
          price: (itemObj.properties?.Price?.value as { amount?: number } | undefined)?.amount
        };
      });
    }
  }

  return ocrResult;
}
