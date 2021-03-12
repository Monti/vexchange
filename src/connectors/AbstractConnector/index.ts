import { EventEmitter } from 'events'
import { AbstractConnectorArguments, ConnectorUpdate, ConnectorEvent } from '../types'

export abstract class AbstractConnector extends EventEmitter {
  public readonly supportedChainIds?: number[]

  constructor({ supportedChainIds }: AbstractConnectorArguments = {}) {
    super()
    this.supportedChainIds = supportedChainIds
  }

  public abstract async activate(): Promise<ConnectorUpdate>
  public abstract async getProvider(): Promise<any>
  public abstract async getChainId(): Promise<number | string>
  public abstract async getAccount(): Promise<null | string>
  public abstract deactivate(): void

  protected emitUpdate(update: ConnectorUpdate): void {
    this.emit(ConnectorEvent.Update, update)
  }

  protected emitError(error: Error): void {
    this.emit(ConnectorEvent.Error, error)
  }

  protected emitDeactivate(): void {
    this.emit(ConnectorEvent.Deactivate)
  }
}
