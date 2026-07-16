import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  tag: { type: String, required: true, unique: true }, // e.g. "P-101"
  name: { type: String, required: true },
  system: { type: String, required: true }, // e.g. "Lube Oil System"
  criticality: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  installDate: { type: Date },
  status: { type: String, enum: ['Running', 'Standby', 'Maintenance', 'Offline'], default: 'Running' },
  failureHistory: [{
    date: { type: Date, required: true },
    description: { type: String, required: true },
    downtimeHours: { type: Number, default: 0 },
    category: { type: String } // e.g. "Mechanical", "Electrical", "Instrumentation"
  }],
  workOrders: [{
    orderId: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['Open', 'In Progress', 'Completed'], default: 'Open' }
  }],
  oemManualRef: { type: String } // excerpt or link to the OEM manual
});

export default mongoose.model('Equipment', equipmentSchema);
