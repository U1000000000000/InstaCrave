const crypto = require('crypto');
const logger = require('../services/logger.service');

/**
 * Mock Payment Gateway - Simulates real payment provider
 * 
 * Provides deterministic responses for testing:
 * - Success: standard card numbers
 * - Decline: specific patterns
 * - Timeout: specific amounts
 * - Error: specific card numbers
 */

class MockPaymentGateway {
  /**
   * Test card patterns for deterministic responses
   */
  static TEST_CARDS = {
    // Success scenarios
    success: {
      visa: '4111111111111111',
      mastercard: '5555555555554444',
      amex: '378282246310005',
    },
    // Decline scenarios
    decline: {
      insufficient_funds: '4000000000000002',
      lost_card: '4000000000000004',
      stolen_card: '4000000000000006',
      expired_card: '4000000000000009',
    },
    // Error scenarios
    error: {
      processing_error: '4000000000000119',
      service_unavailable: '4000000000000127',
    },
    // Timeout scenarios
    timeout: '4000002500003155',
  };

  /**
   * Process payment through mock gateway
   */
  static async processPayment(paymentData) {
    return new Promise((resolve, reject) => {
      const { paymentId, amount, currency, method, cardData, idempotencyKey } = paymentData;
      
      logger.info('Mock gateway processing payment', {
        paymentId,
        amount,
        method,
      });
      
      // Simulate network delay (50-200ms)
      const delay = Math.random() * 150 + 50;
      
      setTimeout(() => {
        try {
          // Determine response based on test card number
          let response;
          
          if (method === 'card' && cardData?.cardNumber) {
            response = this._determineCardResponse(
              cardData.cardNumber,
              amount,
              currency,
              idempotencyKey
            );
          } else if (method === 'wallet') {
            response = this._processWalletPayment(amount, currency, idempotencyKey);
          } else if (method === 'upi') {
            response = this._processUPIPayment(amount, currency, idempotencyKey);
          } else if (method === 'cash_on_delivery') {
            response = this._processCODPayment(amount, currency, idempotencyKey);
          } else {
            throw new Error('Unsupported payment method');
          }
          
          logger.info('Mock gateway response determined', {
            paymentId,
            responseStatus: response.status,
            transactionId: response.transactionId,
          });
          
          resolve(response);
        } catch (error) {
          logger.error('Mock gateway error', {
            paymentId,
            error: error.message,
          });
          reject(error);
        }
      }, delay);
    });
  }

  /**
   * Determine card response based on test card number
   */
  static _determineCardResponse(cardNumber, amount, currency, idempotencyKey) {
    const cardLast4 = cardNumber.slice(-4);
    
    // Check idempotency - return cached response for same key
    if (this._idempotencyCache.has(idempotencyKey)) {
      return this._idempotencyCache.get(idempotencyKey);
    }
    
    let response;
    
    // Check against test cards
    if (Object.values(this.TEST_CARDS.success).includes(cardNumber)) {
      response = {
        status: 'success',
        transactionId: this._generateTransactionId('card'),
        message: 'Payment processed successfully',
        code: 'SUCCESS',
        cardBrand: this._detectCardBrand(cardNumber),
        last4Digits: cardLast4,
        timestamp: new Date().toISOString(),
      };
    } else if (Object.values(this.TEST_CARDS.decline).includes(cardNumber)) {
      const declineReason = Object.entries(this.TEST_CARDS.decline).find(
        ([_, card]) => card === cardNumber
      )[0];
      
      response = {
        status: 'declined',
        transactionId: null,
        message: `Card declined: ${declineReason}`,
        code: `CARD_DECLINED_${declineReason.toUpperCase()}`,
        cardBrand: this._detectCardBrand(cardNumber),
        last4Digits: cardLast4,
        timestamp: new Date().toISOString(),
      };
    } else if (Object.values(this.TEST_CARDS.error).includes(cardNumber)) {
      const errorType = Object.entries(this.TEST_CARDS.error).find(
        ([_, card]) => card === cardNumber
      )[0];
      
      response = {
        status: 'error',
        transactionId: null,
        message: `Payment error: ${errorType}`,
        code: `GATEWAY_ERROR_${errorType.toUpperCase()}`,
        cardBrand: this._detectCardBrand(cardNumber),
        last4Digits: cardLast4,
        timestamp: new Date().toISOString(),
      };
    } else if (cardNumber === this.TEST_CARDS.timeout) {
      // Simulate timeout
      throw new Error('Payment gateway timeout - please retry');
    } else {
      // Random success/decline for unknown cards
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      if (isSuccess) {
        response = {
          status: 'success',
          transactionId: this._generateTransactionId('card'),
          message: 'Payment processed successfully',
          code: 'SUCCESS',
          cardBrand: this._detectCardBrand(cardNumber),
          last4Digits: cardLast4,
          timestamp: new Date().toISOString(),
        };
      } else {
        response = {
          status: 'declined',
          transactionId: null,
          message: 'Card declined - insufficient funds',
          code: 'CARD_DECLINED_INSUFFICIENT_FUNDS',
          cardBrand: this._detectCardBrand(cardNumber),
          last4Digits: cardLast4,
          timestamp: new Date().toISOString(),
        };
      }
    }
    
    // Cache response for idempotency
    this._idempotencyCache.set(idempotencyKey, response);
    
    return response;
  }

  /**
   * Process wallet payment (mock digital wallet)
   */
  static _processWalletPayment(amount, currency, idempotencyKey) {
    // Check idempotency
    if (this._idempotencyCache.has(idempotencyKey)) {
      return this._idempotencyCache.get(idempotencyKey);
    }
    
    // 95% success rate for wallet payments
    const isSuccess = Math.random() > 0.05;
    
    const response = isSuccess
      ? {
          status: 'success',
          transactionId: this._generateTransactionId('wallet'),
          message: 'Wallet payment successful',
          code: 'SUCCESS',
          paymentMethod: 'wallet',
          timestamp: new Date().toISOString(),
        }
      : {
          status: 'declined',
          transactionId: null,
          message: 'Insufficient wallet balance',
          code: 'WALLET_INSUFFICIENT_BALANCE',
          paymentMethod: 'wallet',
          timestamp: new Date().toISOString(),
        };
    
    this._idempotencyCache.set(idempotencyKey, response);
    return response;
  }

  /**
   * Process UPI payment (mock UPI)
   */
  static _processUPIPayment(amount, currency, idempotencyKey) {
    // Check idempotency
    if (this._idempotencyCache.has(idempotencyKey)) {
      return this._idempotencyCache.get(idempotencyKey);
    }
    
    // 92% success rate for UPI
    const isSuccess = Math.random() > 0.08;
    
    const response = isSuccess
      ? {
          status: 'success',
          transactionId: this._generateTransactionId('upi'),
          message: 'UPI payment successful',
          code: 'SUCCESS',
          paymentMethod: 'upi',
          refId: `${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        }
      : {
          status: 'declined',
          transactionId: null,
          message: 'UPI payment declined',
          code: 'UPI_PAYMENT_DECLINED',
          paymentMethod: 'upi',
          timestamp: new Date().toISOString(),
        };
    
    this._idempotencyCache.set(idempotencyKey, response);
    return response;
  }

  /**
   * Process Cash on Delivery
   */
  static _processCODPayment(amount, currency, idempotencyKey) {
    // Check idempotency
    if (this._idempotencyCache.has(idempotencyKey)) {
      return this._idempotencyCache.get(idempotencyKey);
    }
    
    // COD is always "successful" (payment at delivery)
    const response = {
      status: 'success',
      transactionId: this._generateTransactionId('cod'),
      message: 'Cash on delivery order confirmed',
      code: 'COD_CONFIRMED',
      paymentMethod: 'cash_on_delivery',
      timestamp: new Date().toISOString(),
    };
    
    this._idempotencyCache.set(idempotencyKey, response);
    return response;
  }

  /**
   * Process refund through mock gateway
   */
  static async processRefund(refundData) {
    return new Promise((resolve) => {
      const { paymentId, transactionId, amount, reason } = refundData;
      
      logger.info('Mock gateway processing refund', {
        paymentId,
        transactionId,
        amount,
        reason,
      });
      
      // Simulate processing delay
      setTimeout(() => {
        const response = {
          status: 'success',
          refundId: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transactionId,
          amount,
          message: 'Refund processed successfully',
          timestamp: new Date().toISOString(),
        };
        
        logger.info('Mock gateway refund response', {
          paymentId,
          refundId: response.refundId,
        });
        
        resolve(response);
      }, 100 + Math.random() * 100);
    });
  }

  /**
   * Generate transaction ID
   */
  static _generateTransactionId(method) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `txn_${method}_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Detect card brand from number
   */
  static _detectCardBrand(cardNumber) {
    const first = cardNumber.charAt(0);
    const firstTwo = cardNumber.substring(0, 2);
    
    if (first === '4') return 'visa';
    if (first === '5' && firstTwo >= '51' && firstTwo <= '55') return 'mastercard';
    if (first === '5') return 'mastercard';
    if (cardNumber.substring(0, 2) === '34' || cardNumber.substring(0, 2) === '37') return 'amex';
    if (cardNumber.substring(0, 4) === '6011') return 'discover';
    
    return 'unknown';
  }

  /**
   * Idempotency cache (in production, use Redis)
   */
  static _idempotencyCache = new Map();

  /**
   * Clear cache (for testing)
   */
  static clearCache() {
    this._idempotencyCache.clear();
  }

  /**
   * Verify gateway webhook signature
   */
  static verifyWebhookSignature(payload, signature) {
    // Mock implementation - in production, use actual signature verification
    const expectedSignature = crypto
      .createHmac('sha256', 'mock_webhook_secret')
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === expectedSignature;
  }
}

module.exports = MockPaymentGateway;
