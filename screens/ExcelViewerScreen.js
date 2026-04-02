import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import XLSX from 'xlsx';
import { useLanguage } from '../service/LanguageContext';

const ExcelViewerScreen = ({ navigation }) => {
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRows, setFilteredRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [showRowDetail, setShowRowDetail] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async () => {
    try {
      setLoading(true);
      setColumns([]);
      setRows([]);
      setFilteredRows([]);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const file = result.assets[0];
      console.log('Selected file:', file);
      console.log('File name:', file.name);
      console.log('File URI:', file.uri);
      setFileName(file.name);

      // Read file content as binary
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('File content length:', fileContent.length);

      // Parse Excel file with proper options
      const workbook = XLSX.read(fileContent, { 
        type: 'base64',
        cellFormula: false,
        cellStyles: false,
      });

      console.log('Workbook sheets:', workbook.SheetNames);

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        Alert.alert(t('error'), 'No sheets found in Excel file');
        setLoading(false);
        return;
      }

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      console.log('Reading sheet:', sheetName);
      
      const worksheet = workbook.Sheets[sheetName];
      console.log('Worksheet:', worksheet);

      // Get all data with proper range
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        blankrows: false,
      });

      console.log('Parsed data count:', jsonData.length);
      console.log('First row:', jsonData[0]);

      if (!jsonData || jsonData.length === 0) {
        Alert.alert(t('error'), 'No data found in Excel file. Make sure the file has data starting from row 1.');
        setLoading(false);
        return;
      }

      // Get column names from first row
      const columnNames = Object.keys(jsonData[0]);
      console.log('Column names:', columnNames);

      if (columnNames.length === 0) {
        Alert.alert(t('error'), 'No columns found in Excel file');
        setLoading(false);
        return;
      }

      // Process rows with index - filter out completely empty rows
      const processedRows = jsonData
        .filter(row => {
          // Skip rows that are completely empty or just have __EMPTY
          const hasData = Object.keys(row).some(key => 
            key !== '__EMPTY' && row[key] && row[key].toString().trim() !== ''
          );
          return hasData;
        })
        .map((row, index) => {
          const processedRow = { id: index + 1 };
          columnNames.forEach(col => {
            processedRow[col] = row[col] !== undefined ? row[col] : '';
          });
          return processedRow;
        });

      console.log('Processed rows:', processedRows);

      setColumns(columnNames);
      setRows(processedRows);
      setFilteredRows(processedRows);
      setSearchQuery('');

      Alert.alert(
        t('success'),
        `✅ Loaded ${processedRows.length} rows\n✅ ${columnNames.length} columns\n\nColumns: ${columnNames.join(', ')}`
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      console.error('Error stack:', error.stack);
      Alert.alert(
        t('error'), 
        `Failed to upload Excel file:\n${error.message}\n\nMake sure:\n1. File is .xls or .xlsx\n2. File has data in first sheet\n3. Data starts from row 1`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredRows(rows);
    } else {
      const filtered = rows.filter(row =>
        Object.values(row).some(value =>
          value?.toString().toLowerCase().includes(query.toLowerCase())
        )
      );
      setFilteredRows(filtered);
    }
  };

  const RowCard = ({ row }) => (
    <TouchableOpacity
      style={styles.rowCard}
      onPress={() => {
        setSelectedRow(row);
        setShowRowDetail(true);
      }}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rowNumber}>
          <Text style={styles.rowNumberText}>{row.id}</Text>
        </View>
        <View style={styles.rowPreview}>
          {columns.slice(0, 2).map((col, idx) => (
            <View key={idx} style={styles.previewItem}>
              <Text style={styles.previewLabel}>{col}:</Text>
              <Text style={styles.previewValue} numberOfLines={1}>
                {row[col] || 'N/A'}
              </Text>
            </View>
          ))}
        </View>
        <Icon name="chevron-right" size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );

  const ColumnHeader = ({ column }) => (
    <View style={styles.columnHeader}>
      <Text style={styles.columnHeaderText} numberOfLines={2}>
        {column}
      </Text>
    </View>
  );

  const TableCell = ({ value }) => (
    <View style={styles.tableCell}>
      <Text style={styles.tableCellText} numberOfLines={2}>
        {value || 'N/A'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E35" />

      {/* Header */}
      <LinearGradient colors={['#1B5E35', '#1a1f47']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Excel Viewer</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Excel File</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleFileUpload}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="file-excel" size={24} color="#FFF" />
                <Text style={styles.uploadButtonText}>Choose Excel File</Text>
              </>
            )}
          </TouchableOpacity>
          {fileName && (
            <Text style={styles.fileNameText}>File: {fileName}</Text>
          )}
          <Text style={styles.uploadHint}>
            Supported: .xls, .xlsx files with data starting from row 1
          </Text>
        </View>

        {rows.length > 0 && columns.length > 0 && (
          <>
            {/* Info Section */}
            <View style={styles.section}>
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <Icon name="table-large" size={24} color="#C9A84C" />
                  <Text style={styles.infoValue}>{rows.length}</Text>
                  <Text style={styles.infoLabel}>Rows</Text>
                </View>
                <View style={styles.infoCard}>
                  <Icon name="table-column" size={24} color="#27AE60" />
                  <Text style={styles.infoValue}>{columns.length}</Text>
                  <Text style={styles.infoLabel}>Columns</Text>
                </View>
                <View style={styles.infoCard}>
                  <Icon name="filter" size={24} color="#F39C12" />
                  <Text style={styles.infoValue}>{filteredRows.length}</Text>
                  <Text style={styles.infoLabel}>Filtered</Text>
                </View>
              </View>
            </View>

            {/* Search Section */}
            <View style={styles.section}>
              <View style={styles.searchContainer}>
                <Icon name="magnify" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search in all columns..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholderTextColor="#CCC"
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <Icon name="close" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Columns Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Columns ({columns.length})</Text>
              <View style={styles.columnsGrid}>
                {columns.map((col, idx) => (
                  <View key={idx} style={styles.columnTag}>
                    <Icon name="table-column" size={14} color="#C9A84C" />
                    <Text style={styles.columnTagText} numberOfLines={1}>{col}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Data View Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data View</Text>
              <Text style={styles.viewDescription}>
                Showing {filteredRows.length} of {rows.length} rows
              </Text>
            </View>

            {/* Rows List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Card View</Text>
              <FlatList
                data={filteredRows}
                renderItem={({ item }) => <RowCard row={item} />}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Icon name="inbox" size={48} color="#CCC" />
                    <Text style={styles.emptyStateText}>No rows found</Text>
                  </View>
                }
              />
            </View>

            {/* Table View */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Table View (First 20 Rows)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
                <View>
                  {/* Header Row */}
                  <View style={styles.tableRow}>
                    <View style={[styles.tableCell, styles.rowNumberCell]}>
                      <Text style={styles.tableCellText}>#</Text>
                    </View>
                    {columns.map((col, idx) => (
                      <ColumnHeader key={idx} column={col} />
                    ))}
                  </View>

                  {/* Data Rows */}
                  {filteredRows.slice(0, 20).map((row, rowIdx) => (
                    <TouchableOpacity
                      key={rowIdx}
                      style={[styles.tableRow, rowIdx % 2 === 0 && styles.tableRowAlt]}
                      onPress={() => {
                        setSelectedRow(row);
                        setShowRowDetail(true);
                      }}
                    >
                      <View style={[styles.tableCell, styles.rowNumberCell]}>
                        <Text style={styles.tableCellText}>{row.id}</Text>
                      </View>
                      {columns.map((col, colIdx) => (
                        <TableCell key={colIdx} value={row[col]} />
                      ))}
                    </TouchableOpacity>
                  ))}

                  {filteredRows.length > 20 && (
                    <View style={styles.tableRow}>
                      <Text style={styles.moreRowsText}>
                        ... and {filteredRows.length - 20} more rows (click rows above for details)
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </>
        )}

        {rows.length === 0 && fileName && (
          <View style={styles.emptyState}>
            <Icon name="alert-circle" size={64} color="#E74C3C" />
            <Text style={styles.emptyStateText}>No data found</Text>
            <Text style={styles.emptyStateSubtext}>
              The file was uploaded but contains no data. Make sure your Excel file has data starting from row 1.
            </Text>
          </View>
        )}

        {rows.length === 0 && !fileName && (
          <View style={styles.emptyState}>
            <Icon name="file-document-outline" size={64} color="#CCC" />
            <Text style={styles.emptyStateText}>No file uploaded</Text>
            <Text style={styles.emptyStateSubtext}>
              Upload an Excel file to view its contents
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Row Detail Modal */}
      <Modal
        visible={showRowDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRowDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Row #{selectedRow?.id} Details</Text>
              <TouchableOpacity onPress={() => setShowRowDetail(false)}>
                <Icon name="close" size={24} color="#1B5E35" />
              </TouchableOpacity>
            </View>

            {selectedRow && (
              <ScrollView style={styles.modalBody}>
                {columns.map((col, idx) => (
                  <View key={idx} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{col}</Text>
                    <Text style={styles.detailValue}>{selectedRow[col] || 'N/A'}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E35',
    marginBottom: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C9A84C',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#C9A84C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  uploadButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  fileNameText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E35',
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  columnsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  columnTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  columnTagText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#C9A84C',
    fontWeight: '600',
  },
  viewDescription: {
    fontSize: 13,
    color: '#666',
  },
  rowCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  rowPreview: {
    flex: 1,
  },
  previewItem: {
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 13,
    color: '#1B5E35',
    fontWeight: '500',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tableRowAlt: {
    backgroundColor: '#F9F9F9',
  },
  columnHeader: {
    width: 120,
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#1B5E35',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  columnHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  tableCell: {
    width: 120,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    justifyContent: 'center',
  },
  rowNumberCell: {
    width: 50,
    backgroundColor: '#F5F5F5',
  },
  tableCellText: {
    fontSize: 12,
    color: '#1B5E35',
  },
  moreRowsText: {
    fontSize: 12,
    color: '#999',
    padding: 12,
    fontStyle: 'italic',
  },
  tableScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E35',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E35',
  },
  modalBody: {
    flex: 1,
  },
  detailRow: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#1B5E35',
    fontWeight: '500',
  },
});

export default ExcelViewerScreen;

