import api, { API } from './api';

export async function checkoutAppointment(appointmentId, {
  paymentMethod,
  discountType = 'none',
  discountValue = 0,
  totalPaid,
  cardId = null,
  promoId = null,
  note = '',
  paymentSplits = null,
  customServices = null,
  retailItems = null,
} = {}) {
  const res = await api.post(`${API}/appointments/${appointmentId}/checkout`, {
    payment_method: paymentMethod,
    discount_type: discountType,
    discount_value: discountType !== 'none' ? (parseFloat(discountValue) || 0) : 0,
    total_paid: totalPaid,
    card_id: cardId,
    promo_id: promoId,
    note,
    payment_splits: paymentSplits && paymentSplits.length > 1 ? paymentSplits : null,
    custom_services: customServices,
    retail_items: retailItems && retailItems.length ? retailItems : null,
  });
  return res.data;
}

export function extractErrorMessage(err, defaultMsg = 'Errore nel pagamento') {
  return err?.response?.data?.detail || err?.message || defaultMsg;
}
