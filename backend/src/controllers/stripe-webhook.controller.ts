import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpStatus,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService } from '../services/stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripeService: StripeService) {}

  @Post()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    // Check if Stripe is configured
    if (!this.stripeService.isAvailable()) {
      this.logger.warn('Stripe webhook received but Stripe is not configured');
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        error: 'Stripe is not configured',
      });
      return;
    }

    // Validate signature header
    if (!signature) {
      this.logger.warn('Webhook request missing stripe-signature header');
      res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Missing stripe-signature header',
      });
      return;
    }

    // Get raw body for signature verification
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error('Raw body not available - ensure rawBody is enabled');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Raw body not available',
      });
      return;
    }

    let event: { type: string; data: { object: unknown } };

    // Verify webhook signature
    try {
      event = this.stripeService.constructWebhookEvent(rawBody, signature);
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      res.status(HttpStatus.BAD_REQUEST).json({
        error: 'Invalid signature',
      });
      return;
    }

    this.logger.log(`Processing Stripe webhook: ${event.type}`);

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Parameters<
            typeof this.stripeService.handleCheckoutCompleted
          >[0];
          await this.stripeService.handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Parameters<
            typeof this.stripeService.handleSubscriptionUpdated
          >[0];
          await this.stripeService.handleSubscriptionUpdated(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Parameters<
            typeof this.stripeService.handleSubscriptionDeleted
          >[0];
          await this.stripeService.handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Parameters<
            typeof this.stripeService.handlePaymentFailed
          >[0];
          await this.stripeService.handlePaymentFailed(invoice);
          break;
        }

        default:
          this.logger.debug(`Unhandled event type: ${event.type}`);
      }

      // Acknowledge receipt of the event
      res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      this.logger.error(
        `Error handling webhook event ${event.type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Still return 200 to prevent Stripe from retrying
      // Log the error for debugging but acknowledge receipt
      res.status(HttpStatus.OK).json({
        received: true,
        warning: 'Event logged but processing error occurred',
      });
    }
  }
}
