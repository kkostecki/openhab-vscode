import { Hover } from 'vscode'
import { MarkdownString } from 'vscode'

import * as utils from '../Utils'
import * as request from 'request-promise-native'

/**
 * Handles hover actions in editor windows.
 * Provides additional information for existing items through rest api.
 *
 * @author Jerome Luckenbach - Initial contribution
 */
export class HoverProvider {

    /**
     * Only allow a single provider to exist at a time.
     */
    private static _currentProvider: HoverProvider | undefined

    /**
     *
     */
    private  knownItems:String[]

    /**
     *
     */
    private  lastItemsUpdate : Number;

    /**
     * Only allow the class to call the constructor
     */
    public constructor(){
        this.updateItems()
    }

    /**
     * Checks hovered editor area for existing openHAB Items and provides some live data from rest api if aan item name is found.
     *
     * @param hoveredText The currently hovered text part
     * @returns A thenable [Hover](Hover) object with live information or null if no item is found
     */
    public getRestHover(hoveredText) : Thenable<Hover>|null {
        console.log(`Checking if => ${hoveredText} <= is a knownItem now`)
        if(this.knownItems.includes(hoveredText)){
            return new Promise((resolve, reject) => {
                console.log(`Requesting => ${utils.getHost()}/rest/items/${hoveredText} <= now`)

                request(`${utils.getHost()}/rest/items/${hoveredText}`)
                    .then((response) => {
                        let result = JSON.parse(response)

                        if(!result.error) {
                            let resultText = new MarkdownString()

                            // Show Member Information for Group Items too
                            if(result.type === "Group"){
                                resultText.appendCodeblock(`Item ${result.name} | ${result.state}`, 'openhab')
                                resultText.appendMarkdown(`##### Members:`)

                                result.members.forEach( (member, key, result) => {
                                    resultText.appendCodeblock(`Item ${member.name} | ${member.state}`, 'openhab')

                                    // No newline after the last member information
                                    if(!Object.is(result.length - 1, key)){
                                        resultText.appendText(`\n`)
                                    }
                                });
                            }
                            else{
                                resultText.appendCodeblock(`${result.state}`, 'openhab');
                            }

                            resolve(new Hover(resultText))
                        }
                    })
                    .catch(() => reject(false))
            });
        }
        else {
            console.log(`That's no openHAB item. Waiting for the next hover.`)
            return null
        }
    }

    /**
     * Update known Items array and store the last time it has been updated.
     */
    private updateItems() : Boolean {

        request(`${utils.getHost()}/rest/items/`)
            .then((response) => {
                // Clear prossible existing array
                this.knownItems = new Array<String>()

                let result = JSON.parse(response)

                result.forEach(item => {
                    this.knownItems.push(item.name)
                });

                this.lastItemsUpdate = Date.now()

                return true
            })
            .catch((error) => {
                console.log(`Failed to update Items for HoverProvider`)
                console.log(error)

                utils.appendToOutput(`Could not reload items for HoverProvider`)

                return false
            });
        return false
    }
}