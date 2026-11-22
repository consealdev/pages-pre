# Conseal Commercial License

Copyright © 2026 Codesense LLC
License inquiries: license@conseal.dev

---

`conseal` is dual-licensed under the GNU Affero General Public License, version 3 or any later version (the "AGPL"), and this Commercial License. This file describes the commercial license.

---

## The Software

"The Software" means conseal's SDKs, in source and built form:

- conseal-js, published as `@consealdev/conseal`, including its `/sync` and `/ui` entry points
- conseal-dotnet, the sync backend, published as `ConsealDev.Conseal`

One commercial license covers both SDKs. The conseal spec is published separately under the MIT License and needs no commercial license.

### Definitions

"Production environment" means any environment in which the Software processes real user data or supports live business operations, including staging environments accessible by end users.

"Production App" means a distinct, independently operated application or automated workflow that uses the Software in a production environment, where "independently operated" means it serves a separate and identifiable purpose, user base, or business function. For the avoidance of doubt: multiple delivery channels (web, mobile, desktop, API) of the same application serving the same purpose and user base constitute a single Production App; the Software's sync backend, when it serves only one Production App's end users, is part of that Production App; all internal business tooling of an organization where the organization's own personnel are the sole end users constitutes a single Production App regardless of the number of internal tools or services involved; a service or component that operates exclusively as part of a larger application and has no independent production deployment is not a separate Production App.

---

## When You Need a Commercial License

A commercial license is required if you use `conseal` in:

- A proprietary or closed-source application
- A SaaS product or web service whose source code is not publicly available under a compatible open-source license
- Any product or service where you cannot comply with the terms of the AGPL

If your application is fully open source under the AGPL or a compatible license, you do not need a commercial license.

### Permitted Use

The Software is licensed for use in Production Apps that protect and sync the licensee's own end users' data. The Software may not be used to build or operate a hosted sync, backup, or key management service whose purpose is to provide that infrastructure to third-party applications or organizations for their own end users. Using the Software as the underlying infrastructure for a product that other developers or organizations plug into to protect or sync their users' data is outside the scope of all license tiers.

### Transitive Dependency

If `conseal` is pulled in as an indirect dependency of another library or framework rather than used directly in your project, the terms of the AGPL apply automatically and no commercial license is required solely on that basis.

This exemption does not apply if the dependency was introduced, created, or controlled by the licensee's organization for the purpose of circumventing license requirements.

---

## License Tiers

All tiers receive the complete feature set — no capabilities are gated behind paid plans.

| Tier | Who | Description |
|---|---|---|
| **Indie** | Solo developers, small apps | Flat annual fee, one Production App |
| **Business** | Companies, multiple products | Annual fee per Production App |
| **Enterprise** | Large organisations, regulated industries | Custom pricing, SLA, legal indemnification |

---

## License Grant

Subject to payment of the applicable license fee, Codesense LLC grants the licensee a non-exclusive, worldwide, royalty-free license to:

- Use, copy, modify, and integrate the Software into the Production Apps covered by the purchased tier
- Deploy the Software across any number of servers, environments, and infrastructure serving those Production Apps
- Distribute the Software as a component of those Production Apps

without obligation to publish the licensee's application source code and without the copyleft requirements of the AGPL.

A separate license is required for each additional Production App in which the licensee uses the Software in a production environment. Development, staging, and test environments that exist solely to support a licensed Production App are covered under the same license as that Production App and do not require separate licenses.

### Evaluation

Evaluation and testing in non-production environments is permitted without a commercial license for a period not exceeding 30 days.

### License Fees and Renewal

Upon payment, the licensee receives a perpetual license for the version of `conseal` current at the time of purchase, plus one year of updates and security patches. Continued access to new versions after the first year requires annual renewal. Cancellation of renewal does not affect the perpetual license for the version already held.

---

## Ownership and Modifications

Codesense LLC retains all ownership, copyright, and intellectual property rights in the Software at all times. This license grants rights to use the Software; it does not transfer ownership of any kind.

All modifications to the Software made by the licensee remain the intellectual property of the licensee. Codesense LLC claims no ownership over licensee modifications.

All copies, modifications, and distributions of the Software must retain the original copyright notice. Licensees may not remove, alter, or obscure any copyright, trademark, or attribution notices included in the Software.

---

## Conduct

License rights may not be rented, leased, or transferred to any third party without prior written consent from Codesense LLC.

Licensees agree not to make false statements of fact about `conseal`, Codesense LLC, or its contributors that are intended to cause material harm to the reputation of the project or the company. This clause does not restrict good-faith criticism, bug reports, public discussion of software deficiencies, or reviews based on the licensee's genuine experience.

---

## Data and Privacy

Codesense LLC does not collect, process, or retain any data that the licensee processes through the Software. `conseal` encrypts data on the devices of the licensee's end users, and its sync backend runs on infrastructure the licensee operates. For more information, see the Codesense LLC Privacy Policy at [my.codesense.dev/privacy](https://my.codesense.dev/privacy).

---

## Export Compliance

The Software implements cryptographic functionality and may be subject to export control laws and regulations, including the U.S. Export Administration Regulations (EAR) and sanctions programs administered by OFAC. The licensee is solely responsible for complying with all applicable export control and sanctions laws in connection with the licensee's use of the Software.

---

## Disclaimer of Warranty

THIS SOFTWARE IS PROVIDED "AS IS," WITHOUT A WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT. IN NO EVENT SHALL CODESENSE LLC OR ITS CONTRIBUTORS BE LIABLE FOR ANY CLAIM, DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. IN NO EVENT SHALL CODESENSE LLC'S TOTAL CUMULATIVE LIABILITY TO ANY PARTY EXCEED THE GREATER OF (A) THE FEES PAID BY THAT PARTY TO CODESENSE LLC IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (USD 100).

---

## Governing Law and Dispute Resolution

This license is governed by and construed in accordance with the laws of the State of Texas, United States, without regard to its conflict of law provisions.

Any dispute arising out of or relating to this license or the Software shall be resolved by binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules. The arbitration shall take place in Plano, Texas. Judgment on the award rendered by the arbitrator may be entered in any court of competent jurisdiction.

Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of a party's intellectual property rights.

---

For license purchases and inquiries: **license@conseal.dev**
